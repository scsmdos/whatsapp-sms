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
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let clientUser = null;
let isInitializing = false;

const updateStatus = (status, data = null) => {
    connectionStatus = status;
    io.emit('status', status);
    if (status === 'qr_ready') {
        qrCodeData = data;
        io.emit('qr', data);
    } else if (status === 'connected') {
        clientUser = data;
        io.emit('ready', data);
    }
};

const initializeWhatsApp = async () => {
    if (isInitializing) return;
    isInitializing = true;

    try {
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
        const qrcode = require('qrcode');
        const pino = require('pino');

        const authPath = path.join(__dirname, 'auth_info');
        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Desktop')
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCodeData = await qrcode.toDataURL(qr);
                updateStatus('qr_ready', qrCodeData);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    isInitializing = false;
                    setTimeout(initializeWhatsApp, 5000);
                } else {
                    updateStatus('disconnected');
                    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
                    isInitializing = false;
                }
            } else if (connection === 'open') {
                clientUser = sock.user.id.split(':')[0];
                updateStatus('connected', clientUser);
                isInitializing = false;
                qrCodeData = null;
            }
        });

    } catch (err) {
        console.error('Init Error:', err);
        isInitializing = false;
    }
};

// --- SELF PING TO PREVENT SLEEP ---
const RENDER_URL = 'https://whatsapp-sms-wkzg.onrender.com';
setInterval(() => {
    axios.get(RENDER_URL).catch(() => {});
}, 10 * 60 * 1000); // Ping every 10 mins

// Routes
app.get('/', (req, res) => {
    res.send('<h1>WhatsApp Render Service is Running</h1><p>Status: ' + connectionStatus + '</p>');
});

app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus === 'connected',
        status: connectionStatus,
        phoneNumber: clientUser,
        qrCode: qrCodeData
    });
});

app.post('/initialize', (req, res) => {
    initializeWhatsApp();
    res.json({ message: 'Initializing...' });
});

app.post('/send', upload.single('media'), async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(400).json({ error: 'Not connected' });
    const { to, message } = req.body;
    try {
        let jid = to.replace(/[^0-9]/g, '');
        if (jid.length === 10) jid = '91' + jid;
        jid += '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message || '' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Service running on port ${PORT}`);
    setTimeout(initializeWhatsApp, 5000);
});
