import React, { useEffect, useState } from 'react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { Smartphone, AlertCircle, ExternalLink } from 'lucide-react';

const WhatsAppChat = () => {
    const { connected, phoneNumber } = useWhatsApp();
    const [showWhatsAppWeb, setShowWhatsAppWeb] = useState(false);

    useEffect(() => {
        // Show WhatsApp Web iframe after connection
        if (connected) {
            setShowWhatsAppWeb(true);
        }
    }, [connected]);

    if (!connected) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Smartphone size={32} className="text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        WhatsApp Not Connected
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Connect your WhatsApp first to view live messages
                    </p>
                    <a
                        href="/whatsapp"
                        className="inline-flex items-center px-6 py-3 bg-whatsapp-teal text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Smartphone size={18} className="mr-2" />
                        Go to Connection Page
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-[#008069] text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Smartphone size={20} />
                    </div>
                    <div>
                        <h2 className="font-semibold">WhatsApp Web</h2>
                        <p className="text-xs text-white/80">Connected: {phoneNumber}</p>
                    </div>
                </div>
                <a
                    href="https://web.whatsapp.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                >
                    <ExternalLink size={16} />
                    Open in New Tab
                </a>
            </div>

            {/* WhatsApp Web Iframe */}
            {showWhatsAppWeb ? (
                <iframe
                    src="https://web.whatsapp.com"
                    className="flex-1 w-full border-0"
                    title="WhatsApp Web"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                    allow="microphone; camera; clipboard-read; clipboard-write"
                />
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-teal mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading WhatsApp Web...</p>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3">
                <div className="flex gap-3 items-start">
                    <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-yellow-800 mb-1">💡 Pro Tip:</p>
                        <p className="text-yellow-700">
                            You can chat with your contacts directly here! All messages sync with your phone in real-time.
                            Use Campaigns page for bulk messaging.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppChat;
