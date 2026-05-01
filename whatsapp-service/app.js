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
let stepStatus = 'Waiting to start...';
let clientUser = null;
let isInitializing = false;

const updateStatus = (status, step = '', data = null) => {
    connectionStatus = status;
    if (step) stepStatus = step;
    
    io.emit('status', { status, step: stepStatus });
    if (status === 'qr_ready') {
        qrCodeData = data;
        io.emit('qr', data);
    } else if (status === 'connected') {
        clientUser = data;
        io.emit('ready', data);
    }
};

const initializeWhatsApp = async () => {
    if (isInitializing && connectionStatus === 'initializing') return;
    isInitializing = true;
    updateStatus('initializing', 'Step 1: Loading Baileys Libraries...');

    try {
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
        const qrcode = require('qrcode');
        const pino = require('pino');

        updateStatus('initializing', 'Step 2: Setting up Session Storage...');
        const authPath = path.join(__dirname, 'auth_info');
        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        updateStatus('initializing', 'Step 3: Connecting to WhatsApp Servers...');
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Desktop'),
            connectTimeoutMs: 60000,
            retryRequestDelayMs: 5000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                updateStatus('qr_ready', 'Step 4: QR Code Ready! Please scan.');
                qrCodeData = await qrcode.toDataURL(qr);
                io.emit('qr', qrCodeData);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    isInitializing = false;
                    updateStatus('initializing', 'Reconnecting...');
                    setTimeout(initializeWhatsApp, 5000);
                } else {
                    updateStatus('disconnected', 'Logged out. Please re-init.');
                    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
                    isInitializing = false;
                }
            } else if (connection === 'open') {
                clientUser = sock.user.id.split(':')[0];
                updateStatus('connected', 'WhatsApp Connected!');
                isInitializing = false;
                qrCodeData = null;
            }
        });

    } catch (err) {
        console.error('Init Error:', err);
        isInitializing = false;
        updateStatus('disconnected', `Error: ${err.message}`);
    }
};

// --- SELF PING ---
setInterval(() => {
    axios.get('https://whatsapp-sms-wkzg.onrender.com').catch(() => {});
}, 5 * 60 * 1000); 

// Routes
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #25D366;">WhatsApp Render Service</h1>
            <div style="font-size: 20px; margin-bottom: 10px;">Status: <b style="color: blue;">${connectionStatus}</b></div>
            <div style="color: #666; margin-bottom: 20px;">Current Step: ${stepStatus}</div>
            
            <form action="/initialize" method="POST">
                <button type="submit" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Start/Restart Connection
                </button>
            </form>

            <div id="qr-container" style="margin-top: 30px;">
                ${qrCodeData ? `<img src="${qrCodeData}" /><p>Scan now!</p>` : '<p>Wait for QR code to appear...</p>'}
            </div>

            <script>
                const qrContainer = document.getElementById('qr-container');
                setInterval(async () => {
                    const res = await fetch('/status');
                    const data = await res.json();
                    if (data.qrCode) {
                        qrContainer.innerHTML = '<img src="' + data.qrCode + '" /><p>Scan now!</p>';
                    } else if (data.status === 'connected') {
                        qrContainer.innerHTML = '<h2 style="color: green;">✓ Connected as ' + data.phoneNumber + '</h2>';
                    }
                }, 3000);
            </script>
        </div>
    `);
});

app.get('/status', (req, res) => {
    res.json({
        connected: connectionStatus === 'connected',
        status: connectionStatus,
        step: stepStatus,
        phoneNumber: clientUser,
        qrCode: qrCodeData
    });
});

app.post('/initialize', (req, res) => {
    qrCodeData = null;
    initializeWhatsApp();
    res.redirect('/');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Service running on port ${PORT}`);
    setTimeout(initializeWhatsApp, 2000);
});
