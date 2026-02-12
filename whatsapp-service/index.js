const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max file size
    }
});

// WhatsApp Client Setup
let client;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let clientUser = null;
let isInitializing = false; // LOCK to prevent double-init

const initializeClient = async () => {
    if (isInitializing) {
        console.log('⚠️ Already initializing, skipping duplicate request...');
        return;
    }

    isInitializing = true;
    console.log('Initializing WhatsApp Client...');

    try {
        client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process', // Helps on Render
                    '--disable-extensions'
                ],
                headless: true,
                timeout: 0,
            }
        });

        // Client event listeners
        client.on('qr', async (qr) => {
            console.log('QR Code received');
            try {
                qrCodeData = await qrcode.toDataURL(qr);
                io.emit('qr', qrCodeData);
                connectionStatus = 'qr_ready';
            } catch (err) {
                console.error('Error generating QR code:', err);
            }
        });

        client.on('ready', () => {
            console.log('Client is ready!');
            connectionStatus = 'connected';
            clientUser = client.info.wid.user;
            io.emit('ready', clientUser);
            isInitializing = false; // Release lock
        });

        client.on('authenticated', () => {
            console.log('AUTHENTICATED');
            connectionStatus = 'authenticated';
            io.emit('authenticated');
        });

        client.on('auth_failure', (msg) => {
            console.error('AUTHENTICATION FAILURE', msg);
            connectionStatus = 'auth_failed';
            io.emit('auth_failure', msg);
            isInitializing = false; // Release lock
        });

        client.on('disconnected', (reason) => {
            console.log('Client was logged out', reason);
            connectionStatus = 'disconnected';
            qrCodeData = null;
            clientUser = null;
            io.emit('disconnected');
            // Don't auto-reinit immediately to avoid loops
            isInitializing = false;
        });

        await client.initialize();

    } catch (e) {
        console.error('Failed to setup client:', e);
        connectionStatus = 'disconnected';
        isInitializing = false; // Release lock
    }
};

// Initial start
initializeClient();

// Socket.io Connection Handler
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Send current status immediately
    socket.emit('status', connectionStatus);

    // If we have a QR code waiting, send it to the new client
    if (qrCodeData && connectionStatus === 'qr_ready') {
        console.log('Sending cached QR code to new client');
        socket.emit('qr', qrCodeData);
    }

    // If we are authenticated, tell the client
    if (connectionStatus === 'authenticated' || connectionStatus === 'connected') {
        socket.emit('authenticated');
        if (clientUser) {
            socket.emit('ready', clientUser);
        }
    }

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes
app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus === 'connected',
        status: connectionStatus,
        phoneNumber: clientUser,
        qrCode: qrCodeData // Send QR code via API as backup
    });
});

app.post('/initialize', (req, res) => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'auth_failed') {
        // If client exists but is disconnected/failed, we might need to re-init
        // However, initialize() on an existing client usually works.
        // But to be safe, if it's completely dead, we might want to recreate.
        // For now, let's try calling initialize if it exists.
        if (client) {
            client.initialize().catch(err => {
                console.error('Failed to re-initialize client:', err);
            });
        } else {
            initializeClient();
        }
        res.json({ message: 'Initializing WhatsApp Client...' });
    } else {
        res.json({ message: 'Client already initializing or connected', status: connectionStatus });
    }
});

app.post('/disconnect', async (req, res) => {
    console.log('Disconnecting WhatsApp...');
    try {
        if (client) {
            try {
                await client.logout();
                await client.destroy();
            } catch (e) {
                console.error('Error during client logout/destroy:', e);
            }
        }

        // Clear all states
        client = null;
        qrCodeData = null;
        connectionStatus = 'disconnected';
        clientUser = null;

        io.emit('disconnected');
        res.json({ message: 'Logged out and session cleared successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// HARD RESET SESSION
app.post('/reset-session', async (req, res) => {
    console.log('Hard resetting session...');
    try {
        if (client) {
            // Try to destroy the browser instance
            try {
                await client.destroy();
            } catch (e) {
                console.error('Error destroying client:', e);
            }
        }

        client = null;
        qrCodeData = null;
        connectionStatus = 'disconnected';
        clientUser = null;

        // Delete auth folder
        const authPath = './.wwebjs_auth';
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('Deleted .wwebjs_auth folder');
        }

        // FORCE UNLOCK
        isInitializing = false;

        // Re-initialize
        setTimeout(() => {
            initializeClient();
        }, 2000);

        res.json({ success: true, message: 'Session reset successfully. Initializing new session.' });
    } catch (error) {
        console.error('Reset session error:', error);
        res.status(500).json({ error: 'Failed to reset session' });
    }
});

app.post('/send', upload.single('media'), async (req, res) => {
    const { to, message } = req.body;
    const file = req.file;

    if (connectionStatus !== 'connected') {
        return res.status(400).json({ error: 'WhatsApp client not connected' });
    }

    try {
        // Format number: remove +, spaces, dashes. Ensure country code.
        // Assuming Indian numbers (91) if not provided, for simplicity
        let formattedNumber = to.replace(/[^0-9]/g, '');
        if (formattedNumber.length === 10) {
            formattedNumber = '91' + formattedNumber;
        }
        const chatId = formattedNumber + '@c.us';

        let sentMessage;

        if (file) {
            console.log(`📤 Uploading ${file.mimetype} file: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

            // Read file and create media with explicit type
            const fileData = fs.readFileSync(file.path);
            const base64Data = fileData.toString('base64');

            // Force proper MIME type for videos
            let mimeType = file.mimetype;
            if (file.originalname.toLowerCase().endsWith('.mp4')) {
                mimeType = 'video/mp4';
            } else if (file.originalname.toLowerCase().endsWith('.avi')) {
                mimeType = 'video/x-msvideo';
            } else if (file.originalname.toLowerCase().endsWith('.mov')) {
                mimeType = 'video/quicktime';
            }

            const media = new MessageMedia(
                mimeType,
                base64Data,
                file.originalname
            );

            console.log(`⏳ Sending ${mimeType} to ${formattedNumber}...`);
            sentMessage = await client.sendMessage(chatId, media, { caption: message || '' });
            console.log(`✅ Media sent successfully to ${formattedNumber}`);

            // Clean up file
            fs.unlinkSync(file.path);
        } else if (message) {
            sentMessage = await client.sendMessage(chatId, message);
        } else {
            return res.status(400).json({ error: 'Message or media required' });
        }

        res.json({ success: true, messageId: sentMessage.id._serialized });
    } catch (error) {
        console.error('❌ Error sending message:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Failed to send message',
            details: error.message,
            stack: error.stack
        });
    }
});

// Get all chats
app.get('/chats', async (req, res) => {
    console.log(`📥 GET /chats requested. Status: ${connectionStatus}, Client: ${!!client}`);
    try {
        if (!client) {
            console.warn('Chat request rejected: Client not initialized');
            return res.status(503).json({ error: 'WhatsApp client not initialized', status: 'disconnected' });
        }

        // Relaxed check: logic relies on client being truthy. 
        // connectionStatus might be 'qr_ready' if re-connecting, but if client.info is there, we are good.
        if (connectionStatus !== 'connected' && connectionStatus !== 'authenticated' && !client.info) {
            console.warn('Chat request rejected. Status:', connectionStatus);
            return res.status(503).json({ error: 'WhatsApp not connected', status: connectionStatus });
        }

        console.log('Fetching chats from client...');
        const chats = await client.getChats();
        console.log(`Found ${chats.length} chats.`);

        // Optimize: Only process top 20 chats
        const topChats = chats.slice(0, 20);

        const chatList = await Promise.all(topChats.map(async (chat, index) => {
            // Restore Profile Pics for top 12 chats (User wants DPs)
            let profilePicUrl = '';
            if (index < 12) {
                try {
                    const contact = await chat.getContact();
                    profilePicUrl = await contact.getProfilePicUrl();
                } catch (e) { }
            }

            // Use existing lastMessage property instead of fetching (Massive Speedup)
            const lastMsg = chat.lastMessage;
            const lastMsgBody = lastMsg ? (lastMsg.body || (lastMsg.hasMedia ? '📷 Photo' : '')) : '';

            return {
                id: chat.id._serialized,
                name: chat.name || 'Unknown',
                lastMessage: lastMsgBody,
                unreadCount: chat.unreadCount || 0,
                timestamp: chat.timestamp || Date.now(),
                isGroup: chat.isGroup,
                profilePicUrl: profilePicUrl
            };
        }));

        res.json({ chats: chatList.sort((a, b) => b.timestamp - a.timestamp) });
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats', details: error.message });
    }
});

// Get media for a specific message
app.get('/chats/:chatId/messages/:msgId/media', async (req, res) => {
    try {
        if (!client || (connectionStatus !== 'connected' && connectionStatus !== 'authenticated')) {
            return res.status(503).json({ error: 'WhatsApp not connected' });
        }

        const { chatId, msgId } = req.params;
        const chat = await client.getChatById(chatId);

        // Search more messages to find the specific one
        const searchLimit = 100;
        const messages = await chat.fetchMessages({ limit: searchLimit });

        const msg = messages.find(m => m.id._serialized === msgId);

        if (!msg) {
            console.warn(`Message ${msgId} not found in last ${searchLimit} messages`);
            return res.status(404).json({ error: 'Message not found. It might be too old.' });
        }

        if (msg.hasMedia) {
            // Filter out types that might report hasMedia but aren't downloadable strict files in some versions
            // or just to be safe.
            try {
                const media = await msg.downloadMedia();
                if (media) {
                    return res.json({
                        base64: media.data,
                        mimetype: media.mimetype,
                        filename: media.filename
                    });
                } else {
                    console.warn(`Media download returned null for msg ${msgId}`);
                }
            } catch (err) {
                console.error(`Failed to download media for msg ${msgId}:`, err.message);
                return res.status(500).json({ error: 'Download failed', details: err.message });
            }
        }
        res.status(404).json({ error: 'No media found' });

    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ error: 'Failed to fetch media', details: error.message });
    }
});

// Update: Get messages for a specific chat
app.get('/chats/:chatId/messages', async (req, res) => {
    try {
        if (!client || (connectionStatus !== 'connected' && connectionStatus !== 'authenticated')) {
            return res.status(503).json({ error: 'WhatsApp not connected' });
        }

        const { chatId } = req.params;
        const chat = await client.getChatById(chatId);

        let chatPic = '';
        try {
            const contact = await chat.getContact();
            chatPic = await contact.getProfilePicUrl();
        } catch (e) { }

        const messages = await chat.fetchMessages({ limit: 50 });

        const messageList = messages.map(msg => ({
            id: msg.id._serialized,
            body: msg.body,
            fromMe: msg.fromMe,
            timestamp: msg.timestamp,
            type: msg.type,
            hasMedia: msg.hasMedia,
            ack: msg.ack
        }));

        res.json({
            chatId: chat.id._serialized,
            name: chat.name,
            profilePic: chatPic,
            messages: messageList.reverse()
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
    }
});


// Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`WhatsApp Service running on port ${PORT}`);
    // initializeClient() is called at top level
});
