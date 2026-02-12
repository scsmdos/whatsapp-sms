import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const WhatsAppContext = createContext();

export const useWhatsApp = () => {
    const context = useContext(WhatsAppContext);
    if (!context) {
        throw new Error('useWhatsApp must be used within a WhatsAppProvider');
    }
    return context;
};

export const WhatsAppProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const [qrCode, setQrCode] = useState(null);
    const [socket, setSocket] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [phoneNumber, setPhoneNumber] = useState(null);
    const [error, setError] = useState(null);

    const { isAuthenticated, token } = useAuth();

    // Socket Connection Effect
    useEffect(() => {
        if (!isAuthenticated || !token) return;

        // Connect to WhatsApp service via Socket.io with explicit options for Render
        const newSocket = io(import.meta.env.VITE_WHATSAPP_SERVICE_URL, {
            transports: ['websocket', 'polling'], // Allow both for better compatibility
            path: '/socket.io',
            withCredentials: true,
            reconnection: true,
        });
        setSocket(newSocket);

        // Listen for connection events
        newSocket.on('status', (status) => {
            setConnectionStatus(status);
        });

        newSocket.on('qr', (qr) => {
            setQrCode(qr);
            setConnectionStatus('qr_ready');
        });

        newSocket.on('ready', (phone) => {
            setConnected(true);
            setQrCode(null);
            setConnectionStatus('connected');
            setPhoneNumber(phone);
        });

        newSocket.on('authenticated', () => {
            setConnectionStatus('authenticated');
        });

        newSocket.on('disconnected', () => {
            setConnected(false);
            setQrCode(null);
            setConnectionStatus('disconnected');
            setPhoneNumber(null);
        });

        newSocket.on('auth_failure', () => {
            setConnectionStatus('auth_failed');
        });

        return () => {
            newSocket.close();
        };
    }, [isAuthenticated, token]);

    // Status Polling Effect (Runs Always)
    // Status Polling Effect
    useEffect(() => {
        const check = async () => {
            if (connectionStatus === 'initializing') return; // Don't poll while initializing
            await checkConnectionStatus();
        };

        const statusInterval = setInterval(check, 5000);
        return () => clearInterval(statusInterval);
    }, [connectionStatus]);

    const checkConnectionStatus = async () => {
        try {
            const response = await axios.get('whatsapp/status');
            const isConn = response.data.connected || response.data.status === 'connected' || response.data.status === 'authenticated';

            if (isConn) {
                setConnected(true);
                setConnectionStatus(response.data.status || 'connected');
                setPhoneNumber(response.data.phoneNumber);
            } else {
                setConnected(false);
                setConnectionStatus(response.data.status || 'disconnected');
            }
        } catch (error) {
            console.error('Failed to check WhatsApp status:', error);
        }
    };

    const initializeWhatsApp = async () => {
        setError(null);
        setConnectionStatus('initializing');
        try {
            await axios.post('whatsapp/initialize');
        } catch (error) {
            console.error('Failed to initialize WhatsApp:', error);
            setError(error.response?.data?.message || 'Failed to connect to backend.');
            setConnectionStatus('disconnected');
        }
    };

    const disconnectWhatsApp = async () => {
        try {
            await axios.post('whatsapp/disconnect');
            setConnected(false);
            setQrCode(null);
            setConnectionStatus('disconnected');
            setPhoneNumber(null);
        } catch (error) {
            console.error('Failed to disconnect WhatsApp:', error);
        }
    };

    const sendMessage = async (to, message, media = null) => {
        try {
            const formData = new FormData();
            formData.append('to', to);
            formData.append('message', message);
            if (media) {
                formData.append('media', media);
            }

            const response = await axios.post('whatsapp/send', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to send message',
            };
        }
    };

    const sendBulkMessages = async (campaignId) => {
        try {
            const response = await axios.post(`/api/campaigns/${campaignId}/send`);
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to send bulk messages',
            };
        }
    };

    const resetSession = async () => {
        try {
            await axios.post('whatsapp/reset-session');
            setConnected(false);
            setQrCode(null);
            setConnectionStatus('disconnected');
            setPhoneNumber(null);
            return { success: true };
        } catch (error) {
            console.error('Failed to reset session:', error);
            return { success: false, error: error.message };
        }
    };

    const value = {
        connected,
        qrCode,
        connectionStatus,
        phoneNumber,
        error,
        initializeWhatsApp,
        disconnectWhatsApp,
        resetSession,
        sendMessage,
        sendBulkMessages,
    };

    return (
        <WhatsAppContext.Provider value={value}>
            {children}
        </WhatsAppContext.Provider>
    );
};
