import React, { useEffect, useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { QrCode, Smartphone, CheckCircle, Loader2, AlertCircle, RefreshCw, Power } from 'lucide-react';

const WhatsAppConnect = () => {
    const {
        connected,
        qrCode,
        connectionStatus,
        phoneNumber,
        initializeWhatsApp,
        disconnectWhatsApp,
        resetSession,
    } = useWhatsApp();

    const [initializingTime, setInitializingTime] = useState(0);

    useEffect(() => {
        let interval;
        if (connectionStatus === 'initializing') {
            interval = setInterval(() => {
                setInitializingTime(prev => prev + 1);
            }, 1000);
        } else {
            setInitializingTime(0);
        }
        return () => clearInterval(interval);
    }, [connectionStatus]);

    const handleReset = async () => {
        if (!window.confirm('This will completely delete the session and restart. Continue?')) return;
        await resetSession();
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) {
            return;
        }
        try {
            await disconnectWhatsApp();
        } catch (error) {
            console.error('Disconnect error:', error);
            alert('Failed to disconnect. Please try again.');
        }
    };

    // Configuration for different statuses
    const statusConfig = {
        disconnected: {
            title: 'WhatsApp Not Connected',
            description: 'Connect your WhatsApp to start sending bulk messages',
            icon: Smartphone,
            iconColor: 'text-gray-400',
            bgColor: 'bg-gray-100',
            borderColor: 'border-gray-200'
        },
        initializing: {
            title: initializingTime > 15 ? 'Taking longer than expected...' : 'Initializing WhatsApp',
            description: 'Please wait while we set up the connection...',
            icon: Loader2,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
        },
        qr_ready: {
            title: 'Scan QR Code',
            description: 'Open WhatsApp on your phone and scan the QR code below',
            icon: QrCode,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
        },
        authenticated: {
            title: 'Authenticating',
            description: 'Verifying your WhatsApp connection...',
            icon: Loader2,
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        },
        connected: {
            title: 'WhatsApp Connected',
            description: 'Your device is successfully connected.',
            icon: CheckCircle,
            iconColor: 'text-emerald-500', // Green Tick requested
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200'
        },
        auth_failed: {
            title: 'Authentication Failed',
            description: 'Failed to authenticate. Please try again.',
            icon: AlertCircle,
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        },
    };

    const currentStatus = statusConfig[connectionStatus] || statusConfig.disconnected;
    const StatusIcon = currentStatus.icon;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-fade-in bg-[#f8fafc]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-100">
                {/* Header Section */}
                <div className={`p-5 text-center border-b ${currentStatus.borderColor} ${currentStatus.bgColor} transition-colors duration-500`}>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4 relative">
                        <StatusIcon
                            size={32}
                            className={`${currentStatus.iconColor} ${['initializing', 'authenticated'].includes(connectionStatus) ? 'animate-spin' : ''}`}
                        />
                        {/* Pulse effect for connecting states */}
                        {['initializing', 'authenticated'].includes(connectionStatus) && (
                            <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-blue-500"></span>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">
                        {currentStatus.title}
                    </h2>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                        {currentStatus.description}
                    </p>
                </div>

                {/* Content Section */}
                <div className="p-5 space-y-5">
                    {/* QR Code Display */}
                    {!connected && connectionStatus === 'qr_ready' && qrCode && (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                            <div className="p-4 bg-white rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)] border border-gray-100 mb-6">
                                <img
                                    src={qrCode}
                                    alt="WhatsApp QR Code"
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                            <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                                Open WhatsApp &gt; Menu &gt; Linked devices &gt; Link a device
                            </div>
                        </div>
                    )}

                    {/* Connected Status Card */}
                    {connected && (
                        <div className="flex justify-center w-full">
                            <div className="bg-gradient-to-b from-emerald-50 to-white border border-emerald-100 rounded-xl p-4 shadow-sm w-full max-w-xs flex flex-col items-center text-center">
                                <div className="relative mb-3">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                                        <Smartphone className="text-emerald-600" size={32} />
                                    </div>
                                    <div className="absolute bottom-1 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></div>
                                </div>

                                <p className="text-sm font-medium text-emerald-800 mb-1 rounded-full bg-emerald-100/50 px-3 py-0.5">Connected Number</p>
                                <p className="text-xl font-bold text-gray-900 tracking-tight mt-1">
                                    {phoneNumber ? `+${phoneNumber.replace('@c.us', '')}` : 'Unknown'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-3 pt-2">
                        {/* Initial Connect Button */}
                        {!connected && !['initializing', 'qr_ready'].includes(connectionStatus) && (
                            <button
                                onClick={initializeWhatsApp}
                                className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                            >
                                <QrCode size={20} className="mr-2 group-hover:scale-110 transition-transform" />
                                Connect WhatsApp
                            </button>
                        )}

                        {/* Reset Button (only if taking too long) */}
                        {connectionStatus === 'initializing' && initializingTime > 15 && (
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-full hover:bg-amber-100 transition-colors border border-amber-200"
                            >
                                <RefreshCw size={16} className="mr-2" />
                                Reset Connection
                            </button>
                        )}

                        {/* Disconnect Button */}
                        {connected && (
                            <button
                                onClick={handleDisconnect}
                                className="group inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 bg-red-500 rounded-full hover:bg-red-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full max-w-xs">
                                <Power size={18} className="mr-2 group-hover:rotate-90 transition-transform" />
                                Disconnect WhatsApp
                            </button>
                        )}

                        {/* Retry Button */}
                        {connectionStatus === 'auth_failed' && (
                            <button
                                onClick={initializeWhatsApp}
                                className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                            >
                                <RefreshCw size={16} className="mr-2" />
                                Try Again
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Instructions (only when disconnected) */}
                {!connected && (
                    <div className="bg-gray-50/50 p-4 border-t border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-900 mb-3 text-center uppercase tracking-wider">Simple Steps to Connect</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            {[
                                { step: 1, text: 'Open WhatsApp on your phone' },
                                { step: 2, text: 'Tap Menu or Settings and select Linked Devices' },
                                { step: 3, text: 'Tap on Link a Device and scan the code' },
                            ].map((item) => (
                                <div key={item.step} className="flex flex-col items-center group">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 font-bold flex items-center justify-center mb-2 shadow-sm group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                                        {item.step}
                                    </div>
                                    <p className="text-sm text-gray-600 px-2 leading-snug">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppConnect;
