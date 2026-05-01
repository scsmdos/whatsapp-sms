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

const upload = multer({ dest: 'uploads/' });

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
    if (isInitializing && connectionStatus === 'initializing') return;
    isInitializing = true;
    lastError = null;

    try {
        updateStatus('initializing', 'Loading libraries...');
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
        const qrcode = require('qrcode');
        const pino = require('pino');

        updateStatus('initializing', 'Fetching latest WA version...');
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Using Baileys v${version.join('.')}, isLatest: ${isLatest}`);

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        updateStatus('initializing', `Connecting (WA v${version.join('.')})...`);
        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ["Mac OS", "Chrome", "120.0.0.0"],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                updateStatus('qr_ready', 'QR Code Ready! Scan now.');
                qrCodeData = await qrcode.toDataURL(qr);
                io.emit('qr', qrCodeData);
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                updateStatus('disconnected', `Closed: ${lastDisconnect.error?.message || 'Unknown'}`);
                if (shouldReconnect) {
                    isInitializing = false;
                    setTimeout(() => initializeWhatsApp(), 3000);
                } else {
                    const authPath2 = path.join(__dirname, 'auth_info');
                    if (fs.existsSync(authPath2)) fs.rmSync(authPath2, { recursive: true, force: true });
                }
            } else if (connection === 'open') {
                clientUser = sock.user.id.split(':')[0];
                updateStatus('connected', 'Connected!', null);
                isInitializing = false;
                qrCodeData = null;
                console.log('WhatsApp Connected as:', clientUser);
            }
        });

    } catch (err) {
        console.error('INIT ERROR:', err.message);
        isInitializing = false;
        updateStatus('disconnected', `INIT FAILED`, err.message);
        setTimeout(initializeWhatsApp, 10000);
    }
};

// Self-ping to prevent Render sleep
setInterval(() => {
    axios.get('https://whatsapp-sms-wkzg.onrender.com/ping').catch(() => {});
}, 4 * 60 * 1000);

// Routes
app.get('/ping', (req, res) => res.send('pong'));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>WhatsApp Service</title><meta http-equiv="refresh" content="5"></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
            <h1 style="color:#25D366">WhatsApp Render Service</h1>
            <p>Status: <b>${connectionStatus}</b></p>
            <p>Step: ${stepStatus}</p>
            ${lastError ? `<p style="color:red">Error: ${lastError}</p>` : ''}
            <form action="/reinit" method="POST">
                <button style="padding:10px 20px;background:#25D366;color:white;border:none;border-radius:5px;cursor:pointer">
                    Reset & Reconnect
                </button>
            </form>
            <div style="margin-top:30px">
                ${qrCodeData ? `<img src="${qrCodeData}"><p><b>Scan this QR!</b></p>` : '<p>Waiting for QR...</p>'}
            </div>
        </body>
        </html>
    `);
});

app.get('/status', (req, res) => res.json({
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    step: stepStatus,
    error: lastError,
    phoneNumber: clientUser,
    qrCode: qrCodeData
}));

app.post('/reinit', (req, res) => {
    isInitializing = false;
    qrCodeData = null;
    const authPath = path.join(__dirname, 'auth_info');
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
    initializeWhatsApp();
    res.redirect('/');
});

app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            sock.end();
            sock = null;
        }
        const authPath = path.join(__dirname, 'auth_info');
        if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
        updateStatus('disconnected', 'Disconnected by user');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/reset-session', (req, res) => {
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
    res.json({ success: true });
});

app.post('/send', upload.single('media'), async (req, res) => {
    if (!sock || connectionStatus !== 'connected') return res.status(400).json({ error: 'Not connected' });
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
    console.log(`Running on port ${PORT}`);
    setTimeout(initializeWhatsApp, 2000);
});
