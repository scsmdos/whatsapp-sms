// FIX: crypto polyfill for Node.js < 19
if (typeof global.crypto === 'undefined') {
    global.crypto = require('crypto').webcrypto;
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['https://smssecure.in', 'https://www.smssecure.in', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let stepStatus = 'Waiting...';
let lastError = null;
let clientUser = null;
let isInitializing = false;

const updateStatus = (status, step = '', error = null) => {
    connectionStatus = status;
    if (step) stepStatus = step;
    if (error !== null) lastError = error;
    // Emit plain string for frontend compatibility
    io.emit('status', status);
};

const initializeWhatsApp = async () => {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
    const qrcode = require('qrcode');
    const pino = require('pino');

    if (isInitializing || connectionStatus === 'connected') return;
    isInitializing = true;
    updateStatus('initializing', 'Fetching WA Version...');

    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`[SYSTEM] Starting Connect (WA v${version.join('.')}, Latest: ${isLatest})`);
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state,
            logger: pino({ level: 'error' }), // Enable error logs to see why it drops
            browser: Browsers.ubuntu('Desktop'), // Native safe identity
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            emitOwnEvents: true,
            markOnlineOnConnect: true
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('[SYSTEM] New QR Generated');
                updateStatus('qr_ready', 'QR Code Ready! Scan now.');
                qrCodeData = await qrcode.toDataURL(qr);
                io.emit('qr', qrCodeData);
            }

            if (connection === 'close') {
                const errorCode = (lastDisconnect.error)?.output?.statusCode;
                const shouldReconnect = errorCode !== DisconnectReason.loggedOut;
                
                console.log(`[SYSTEM] Connection Closed. Reason: ${errorCode}. Reconnecting: ${shouldReconnect}`);
                
                qrCodeData = null;
                updateStatus('disconnected', `Session Closed (${errorCode})`);

                if (shouldReconnect) {
                    isInitializing = false;
                    setTimeout(initializeWhatsApp, 5000); // 5s gap for safety
                } else {
                    console.log('[SYSTEM] Logged out. Clearing session...');
                    const authPath = path.join(__dirname, 'auth_info');
                    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
                    initializeWhatsApp();
                }
            } else if (connection === 'open') {
                clientUser = sock.user.id.split(':')[0];
                console.log(`[SYSTEM] Successfully Connected as ${clientUser}`);
                qrCodeData = null;
                isInitializing = false;
                updateStatus('connected', 'System Online', null);
                io.emit('status_update', { connected: true, status: 'connected', phoneNumber: clientUser });
            }
        });

    } catch (err) {
        console.error('[CRITICAL] Init Error:', err.message);
        isInitializing = false;
        updateStatus('disconnected', 'System Error', err.message);
        setTimeout(initializeWhatsApp, 10000);
    }
};

// --- API Routes (Powerfull Endpoints) ---

app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus === 'connected',
        status: connectionStatus,
        step: stepStatus,
        error: lastError,
        phoneNumber: clientUser,
        qrCode: qrCodeData,
        timestamp: new Date().toISOString()
    });
});

app.post('/initialize', (req, res) => {
    console.log('[API] Manual Initialization Requested');
    qrCodeData = null;
    isInitializing = false;
    initializeWhatsApp();
    res.json({ success: true, message: 'System Re-Initializing' });
});

app.post('/reset-session', (req, res) => {
    console.log('[API] Session Reset Requested');
    const authPath = path.join(__dirname, 'auth_info');
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
    qrCodeData = null;
    isInitializing = false;
    connectionStatus = 'disconnected';
    if (sock) {
        sock.end();
        sock = null;
    }
    initializeWhatsApp();
    res.json({ success: true, message: 'Session Cleared & Resetting' });
});

app.post('/send', upload.single('media'), async (req, res) => {
    if (!sock || connectionStatus !== 'connected') {
        console.error(`[SEND ERROR] Rejected because WhatsApp is not connected. Status: ${connectionStatus}`);
        return res.status(400).json({ error: 'WhatsApp not connected. Please scan QR or wait for reconnection.' });
    }

    const { to, message } = req.body;
    try {
        const toStr = String(to);
        let jid = toStr.replace(/[^0-9]/g, '');
        if (jid.length === 10) jid = '91' + jid;
        jid += '@s.whatsapp.net';

        console.log(`[SEND] Dispatching to ${jid}...`);

        if (req.file) {
            const mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
            await sock.sendMessage(jid, { 
                [mediaType]: req.file.buffer, 
                caption: message || '' 
            });
        } else {
            await sock.sendMessage(jid, { text: message || '' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(`[SEND ERROR] ${to}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <body style="font-family:sans-serif; text-align:center; padding-top:50px; background:#f0f2f5">
            <h1 style="color:#25D366">WhatsApp Power-Service Online</h1>
            <p>Status: <b>${connectionStatus.toUpperCase()}</b></p>
            <p>Phone: ${clientUser || 'N/A'}</p>
            <div style="margin-top:20px">
                ${qrCodeData ? `<img src="${qrCodeData}"><br><b>SCAN NOW</b>` : '<p>System Ready & Listening</p>'}
            </div>
            <p style="color:gray; font-size:12px; margin-top:50px">V2.0.0 Power-Engine</p>
        </body>
        </html>
    `);
});

app.get('/ping', (req, res) => res.send('System Awake'));

// --- Self-Ping System to prevent Render sleep ---
setInterval(() => {
    console.log('[KEEP-ALIVE] Pinging self...');
    axios.get('https://whatsapp-sms-wkzg.onrender.com/ping')
        .then(() => console.log('[KEEP-ALIVE] Pulse OK'))
        .catch(err => console.log('[KEEP-ALIVE] Pulse Failed:', err.message));
}, 5 * 60 * 1000); // Every 5 minutes

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`[POWER-ON] System listening on port ${PORT}`);
    setTimeout(initializeWhatsApp, 2000);
});
