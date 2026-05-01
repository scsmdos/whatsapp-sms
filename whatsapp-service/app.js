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
    if (isInitializing && connectionStatus !== 'disconnected') return;
    isInitializing = true;
    updateStatus('initializing');

    try {
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
        const qrcode = require('qrcode');
        const pino = require('pino');

        const authPath = path.join(__dirname, 'auth_info');
        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
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
                    setTimeout(initializeWhatsApp, 3000);
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
        updateStatus('disconnected');
    }
};

// --- SELF PING ---
const RENDER_URL = 'https://whatsapp-sms-wkzg.onrender.com';
setInterval(() => {
    axios.get(RENDER_URL).catch(() => {});
}, 5 * 60 * 1000); 

// Routes
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #25D366;">WhatsApp Render Service</h1>
            <div style="font-size: 20px; margin-bottom: 20px;">Status: <b style="color: blue;">${connectionStatus}</b></div>
            <form action="/initialize" method="POST">
                <button type="submit" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Re-Initialize WhatsApp
                </button>
            </form>
            ${qrCodeData ? `<div style="margin-top: 20px;"><img src="${qrCodeData}" /><p>Scan this with your phone</p></div>` : ''}
        </div>
    `);
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
    res.redirect('/');
});

app.get('/qr', (req, res) => {
    if (qrCodeData) {
        res.send(`<img src="${qrCodeData}" />`);
    } else {
        res.send('QR not ready or already connected.');
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Service running on port ${PORT}`);
    setTimeout(initializeWhatsApp, 2000);
});
