import React, { useState, useEffect } from 'react';
import { User, Key, Bell, Shield, Smartphone, Globe, Loader2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWhatsApp } from '../context/WhatsAppContext';
import axios from 'axios';

const SettingsSection = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl shadow-card p-6 border border-gray-100 mb-6 font-roboto">
        <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
            <div className="p-2 bg-whatsapp-light/10 rounded-lg text-whatsapp-teal">
                <Icon size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        {children}
    </div>
);

const Settings = () => {
    const { user, loading: authLoading } = useAuth();
    const { connected, connectionStatus, phoneNumber, disconnectWhatsApp } = useWhatsApp();

    const [profile, setProfile] = useState({ name: '', email: '' });
    const [settings, setSettings] = useState({ sending_delay: 5 });
    const [apiKey, setApiKey] = useState({ hasKey: false, preview: 'No API Key generated' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setProfile({ name: user.name, email: user.email });
        }
    }, [user]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [settingsRes, apiKeyRes] = await Promise.all([
                    axios.get('/api/settings'),
                    axios.get('/api/settings/api-key')
                ]);

                setSettings(settingsRes.data);
                setApiKey(apiKeyRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to load settings:", error);
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSettingChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await Promise.all([
                axios.put('/api/settings/profile', { name: profile.name }),
                axios.put('/api/settings', { settings: settings })
            ]);
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerateKey = async () => {
        if (!window.confirm('Are you sure? This will invalidate the old API Key.')) return;

        try {
            const response = await axios.post('/api/settings/api-key/regenerate');
            setApiKey({ hasKey: true, preview: response.data.apiKey });
            alert('New API Key Generated: ' + response.data.apiKey);
        } catch (error) {
            alert('Failed to regenerate key');
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm("Disconnect WhatsApp?")) return;
        try {
            await disconnectWhatsApp();
        } catch (e) {
            console.error(e);
        }
    }

    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-whatsapp-green" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                    <p className="text-gray-500 text-sm">Manage your account and preferences</p>
                </div>
                {message.text && (
                    <div className={`px-4 py-2 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            <SettingsSection title="Profile Information" icon={User}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={profile.name}
                            onChange={handleProfileChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-whatsapp-light focus:border-whatsapp-light outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={profile.email}
                            disabled
                            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                        />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="WhatsApp Configuration" icon={Smartphone}>
                <div className="space-y-4">
                    <div className={`flex items-center justify-between p-4 rounded-lg border ${connected ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div>
                            <h4 className={`font-medium ${connected ? 'text-green-900' : 'text-red-900'}`}>
                                {connected ? 'Connected Device' : 'Device Not Connected'}
                            </h4>
                            <p className={`text-sm mt-1 ${connected ? 'text-green-700' : 'text-red-700'}`}>
                                Status: <span className="font-bold uppercase">{connectionStatus}</span>
                                {connected && phoneNumber && <span className="ml-2">({phoneNumber})</span>}
                            </p>
                        </div>
                        {connected ? (
                            <button
                                onClick={handleDisconnect}
                                className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                            >
                                Disconnect
                            </button>
                        ) : (
                            <div className="text-sm text-red-600 font-medium">
                                Go to Connect page to link device
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sending Delay (Seconds)</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="number"
                                name="sending_delay"
                                value={settings.sending_delay || 5}
                                onChange={handleSettingChange}
                                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-whatsapp-light focus:border-whatsapp-light outline-none"
                                min="1"
                            />
                            <span className="text-sm text-gray-500">Recommended: 5-10 seconds to avoid ban</span>
                        </div>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="API Access" icon={Key}>
                <div
                    className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm break-all cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => {
                        if (apiKey.preview && apiKey.preview !== 'No API Key generated') {
                            navigator.clipboard.writeText(apiKey.preview);
                            alert('API Key copied to clipboard!');
                        }
                    }}
                    title="Click to copy"
                >
                    {apiKey.preview || "No API Key found"}
                </div>
                <button
                    onClick={handleRegenerateKey}
                    className="mt-3 text-sm text-whatsapp-teal font-medium hover:underline focus:outline-none"
                >
                    {apiKey.hasKey ? 'Regenerate Key' : 'Generate Key'}
                </button>
            </SettingsSection>

            <div className="flex justify-end pt-4 sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 z-10 backdrop-blur-sm bg-opacity-90">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-6 py-3 bg-whatsapp-teal text-white rounded-lg hover:bg-whatsapp-dark font-bold shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {saving && <Loader2 className="animate-spin mr-2" size={20} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
