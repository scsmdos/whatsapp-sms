// FIX FOR CRYPTO ERROR
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
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let stepStatus = 'Waiting to start...';
let lastError = null;
let clientUser = null;
let isInitializing = false;

const updateStatus = (status, step = '', error = null) => {
    connectionStatus = status;
    if (step) stepStatus = step;
    if (error) lastError = error;
    
    io.emit('status', { status, step: stepStatus, error: lastError });
};

const initializeWhatsApp = async () => {
    if (isInitializing && connectionStatus === 'initializing') return;
    isInitializing = true;
    updateStatus('initializing', 'Step 1: Initializing Libraries...');

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
            browser: Browsers.ubuntu('Chrome'),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                updateStatus('qr_ready', 'Step 4: QR Code Ready!');
                qrCodeData = await qrcode.toDataURL(qr);
                io.emit('qr', qrCodeData);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                const reason = lastDisconnect.error?.message || 'Connection Rejected';
                
                isInitializing = false;
                qrCodeData = null;
                
                if (statusCode !== DisconnectReason.loggedOut) {
                    updateStatus('initializing', `Retrying... (Reason: ${reason})`, reason);
                    setTimeout(initializeWhatsApp, 5000);
                } else {
                    updateStatus('disconnected', 'Logged out.', reason);
                    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
                }
            } else if (connection === 'open') {
                clientUser = sock.user.id.split(':')[0];
                updateStatus('connected', 'WhatsApp Connected!');
                isInitializing = false;
                qrCodeData = null;
                lastError = null;
            }
        });

    } catch (err) {
        console.error('Init Error:', err);
        isInitializing = false;
        updateStatus('disconnected', `Error: ${err.message}`, err.message);
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
            <div style="color: #666; margin-bottom: 5px;">Step: ${stepStatus}</div>
            ${lastError ? `<div style="color: red; font-size: 14px; margin-bottom: 20px;">Error: ${lastError}</div>` : ''}
            
            <form action="/initialize" method="POST">
                <button type="submit" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reset & Try Again
                </button>
            </form>

            <div id="qr-container" style="margin-top: 30px;">
                ${qrCodeData ? `<img src="${qrCodeData}" /><p>Scan now!</p>` : '<p>Wait for QR... (Generating)</p>'}
            </div>

            <script>
                setInterval(async () => {
                    const res = await fetch('/status');
                    const data = await res.json();
                    if (data.qrCode) {
                        document.getElementById('qr-container').innerHTML = '<img src="' + data.qrCode + '" /><p>Scan now!</p>';
                    } else if (data.status === 'connected') {
                        document.getElementById('qr-container').innerHTML = '<h2 style="color: green;">✓ Connected!</h2>';
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
        error: lastError,
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
    setTimeout(initializeWhatsApp, 2000);
});
