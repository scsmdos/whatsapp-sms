import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Search, Send, Paperclip, MoreVertical, Phone, Video,
    Smile, Mic, Image as ImageIcon, Check, CheckCheck, Loader2, Smartphone, MessageCircle, FileQuestion
} from 'lucide-react';
import { useWhatsApp } from '../context/WhatsAppContext';

// Media Component to fetch and display image/video
const MediaAttachment = ({ chatId, msgId, type }) => {
    const [mediaSrc, setMediaSrc] = useState(null);
    const [mimeType, setMimeType] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchMedia = async () => {
            try {
                // Encode chatId as it contains special chars like @
                const safeChatId = encodeURIComponent(chatId);
                const safeMsgId = encodeURIComponent(msgId);
                const response = await axios.get(`/api/whatsapp/chats/${safeChatId}/messages/${safeMsgId}/media`);

                if (isMounted && response.data && response.data.base64) {
                    setMediaSrc(`data:${response.data.mimetype};base64,${response.data.base64}`);
                    setMimeType(response.data.mimetype);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Failed to load media", err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchMedia();
        return () => { isMounted = false; };
    }, [chatId, msgId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-lg">
                <Loader2 className="animate-spin text-gray-400" />
                <span className="ml-2 text-xs text-gray-500">Loading...</span>
            </div>
        );
    }

    if (error || !mediaSrc) {
        return (
            <div className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-lg border border-dashed border-gray-300 p-4">
                <div className="text-center text-gray-400">
                    <FileQuestion className="mx-auto mb-1" />
                    <span className="text-xs">Media unavailable</span>
                    <br />
                    <span className="text-[10px]">Type: {type}</span>
                </div>
            </div>
        );
    }

    if (mimeType?.startsWith('video/')) {
        return (
            <video controls className="max-w-full rounded-lg max-h-[300px]">
                <source src={mediaSrc} type={mimeType} />
                Your browser does not support video.
            </video>
        );
    }

    // Default to Image
    return (
        <img
            src={mediaSrc}
            alt="Media Attachment"
            className="rounded-lg object-cover max-h-[300px] w-auto max-w-full cursor-pointer hover:opacity-95 shadow-sm"
            onClick={() => {
                // Simple fullscreen view (optional, using browser feature for now)
                const w = window.open("");
                w.document.write('<img src="' + mediaSrc + '" style="max-width:100%; height:auto;"/>');
            }}
        />
    );
};

const Messages = () => {
    const { connected, connectionStatus } = useWhatsApp();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef(null);
    const [activeChatProfile, setActiveChatProfile] = useState(null);

    // Socket Connection Effect
    useEffect(() => {
        const isConn = connected || connectionStatus === 'connected' || connectionStatus === 'authenticated';
        if (isConn) {
            fetchChats();
        }
    }, [connected, connectionStatus]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchChats = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/whatsapp/chats');
            if (response.data && Array.isArray(response.data.chats)) {
                setChats(response.data.chats);
            } else if (Array.isArray(response.data)) {
                setChats(response.data);
            } else {
                setChats([]);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChat = async (chat) => {
        setSelectedChat(chat);
        setChatLoading(true);
        setActiveChatProfile(null);
        try {
            // Encode chat ID to handle special characters correctly
            const safeChatId = encodeURIComponent(chat.id);
            const response = await axios.get(`/api/whatsapp/chats/${safeChatId}/messages`);

            if (response.data.messages) {
                setMessages(response.data.messages);
                setActiveChatProfile({
                    name: response.data.name || chat.name,
                    pic: response.data.profilePic || null
                });
            } else if (Array.isArray(response.data)) {
                setMessages(response.data);
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setChatLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;

        setSending(true);

        // Auto-replace {name} placeholder with contact name
        let finalMessage = messageInput;
        if (finalMessage.includes('{name}')) {
            // If checking specifically for name. If name is phone number, it uses phone number.
            finalMessage = finalMessage.replace(/{name}/g, selectedChat.name || 'Friend');
        }

        try {
            // Optimistic Update
            const tempMsg = {
                id: 'temp-' + Date.now(),
                body: finalMessage,
                fromMe: true,
                timestamp: Date.now() / 1000,
                ack: 0
            };
            setMessages(prev => [...prev, tempMsg]);

            await axios.post('/api/whatsapp/send', {
                to: selectedChat.id.replace('@c.us', ''),
                message: finalMessage
            });

            setMessageInput('');
            setTimeout(() => loadChat(selectedChat), 1000);

        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredChats = chats.filter(chat =>
        chat.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isConnected = connected || connectionStatus === 'connected' || connectionStatus === 'authenticated';

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center h-full bg-[#f0f2f5]">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <Smartphone size={32} className="text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Not Connected</h2>
                    <p className="text-gray-600 mb-6">Scan QR code to view messages.</p>
                    <a href="/whatsapp" className="inline-flex items-center px-6 py-3 bg-[#00a884] text-white rounded-lg hover:bg-[#008f6f] transition-colors">
                        Connect WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-80px)] bg-[#f0f2f5] overflow-hidden font-sans">
            {/* Left Sidebar */}
            <div className="w-[400px] flex flex-col bg-white border-r border-[#e9edef]">
                {/* Sidebar Header */}
                <div className="h-[60px] bg-[#f0f2f5] flex items-center justify-between px-4 border-b border-[#e9edef]">
                    <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden cursor-pointer" title="My Profile">
                        <div className="w-full h-full flex items-center justify-center bg-gray-400 text-white font-bold">
                            ME
                        </div>
                    </div>
                    <div className="flex gap-4 text-[#54656f]">
                        <button onClick={fetchChats} title="Refresh" className="hover:bg-gray-200 p-2 rounded-full transition-all">
                            <Loader2 size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button className="hover:bg-gray-200 p-2 rounded-full transition-all" title="New Chat" onClick={() => alert('New Chat feature coming soon!')}>
                            <MessageCircle size={20} />
                        </button>
                        <button className="hover:bg-gray-200 p-2 rounded-full transition-all" title="Menu" onClick={() => alert('Menu options')}>
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-2 border-b border-[#e9edef] bg-white">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-[#54656f]" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-[#f0f2f5] text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-0 sm:text-sm transition-all"
                            placeholder="Search or start new chat"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading && chats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                            <Loader2 className="animate-spin text-whatsapp-teal mb-2" size={32} />
                            <p className="text-sm">Loading chats...</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                            <MessageCircle size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">No chats found</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                {searchTerm ? 'No chats match your search.' : 'Your chat list is empty or syncing.'}
                            </p>
                            {!searchTerm && (
                                <button
                                    onClick={fetchChats}
                                    className="px-4 py-2 bg-whatsapp-teal text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                >
                                    <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
                                    Refresh Chats
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => loadChat(chat)}
                                className={`flex items-center p-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors group ${selectedChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''
                                    }`}
                            >
                                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gray-300 overflow-hidden mr-3">
                                    {chat.profilePicUrl ? (
                                        <img src={chat.profilePicUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold">
                                            {chat.name?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 border-b border-[#f0f2f5] pb-3 group-hover:border-transparent">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-[17px] font-normal text-[#111b21] truncate">{chat.name}</h3>
                                        <span className="text-xs text-[#667781] whitespace-nowrap">
                                            {new Date(chat.timestamp * 1000).toLocaleDateString() === new Date().toLocaleDateString()
                                                ? new Date(chat.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(chat.timestamp * 1000).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-[#667781] truncate flex items-center gap-1 w-[90%]">
                                            {chat.lastMessage?.includes('📷') && <ImageIcon size={14} />}
                                            {chat.lastMessage}
                                        </p>
                                        {chat.unreadCount > 0 && (
                                            <span className="bg-[#25d366] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Chat Area */}
            {selectedChat ? (
                <div className="flex-1 flex flex-col bg-[#efeae2] relative">
                    {/* Chat Background Pattern */}
                    <div className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    </div>

                    {/* Header */}
                    <div className="h-[60px] bg-[#f0f2f5] flex items-center px-4 border-b border-[#e9edef] z-10 w-full cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden mr-4">
                            {activeChatProfile?.pic ? (
                                <img src={activeChatProfile.pic} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold">
                                    {selectedChat.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[16px] font-normal text-[#111b21]">{selectedChat.name}</h3>
                            <p className="text-xs text-[#667781]">click for info</p>
                        </div>
                        <div className="flex gap-6 text-[#54656f]">
                            <Search size={20} className="cursor-pointer" />
                            <MoreVertical size={20} className="cursor-pointer" />
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 z-10 space-y-1 custom-scrollbar">
                        {chatLoading ? (
                            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-[#00a884]" /></div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-1 group`}>
                                    <div
                                        className={`relative max-w-[65%] rounded-lg px-2 py-1 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-[14.2px] leading-[19px] ${msg.fromMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'
                                            }`}
                                    >
                                        {/* Media Placeholder -> Replaced with MediaAttachment Component */}
                                        {msg.hasMedia && (
                                            <div className="mb-1 min-w-[200px] min-h-[150px]">
                                                <MediaAttachment
                                                    chatId={selectedChat.id}
                                                    msgId={msg.id}
                                                    type={msg.type}
                                                />
                                            </div>
                                        )}

                                        {/* Message Text with float handling for time */}
                                        <div className="px-1 text-[#111b21] pb-1 inline-block">
                                            {msg.body}
                                            {/* Spacer to push time to right if sticking on same line */}
                                            <span className="invisible inline-block w-16"></span>
                                        </div>

                                        {/* Time & Checkmarks - Floating Bottom Right */}
                                        <div className="float-right -mt-1 ml-1 flex items-end gap-0.5 text-[11px] text-[#667781] h-4 relative top-1">
                                            <span>{formatTime(msg.timestamp)}</span>
                                            {msg.fromMe && (
                                                <span className={`${msg.ack >= 3 ? 'text-[#53bdeb]' : 'text-[#667781]'} flex items-end`}>
                                                    {msg.ack >= 2 ? <CheckCheck size={16} /> : <Check size={16} />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#f0f2f5] p-2 z-10 w-full flex items-end gap-2">
                        <div className="flex gap-2 p-2 text-[#54656f]">
                            <Smile size={26} className="cursor-pointer hover:text-[#41525d] p-1" />
                            <Paperclip size={26} className="cursor-pointer hover:text-[#41525d] p-1" />
                        </div>
                        <div className="flex-1 mb-1">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)}
                                placeholder="Type a message"
                                className="w-full py-2 px-4 rounded-lg border-none focus:ring-0 text-[15px] placeholder:text-[#667781] bg-white h-10 shadow-sm"
                            />
                        </div>
                        <div className="p-2 text-[#54656f]">
                            {messageInput.trim() ? (
                                <button onClick={handleSendMessage}>
                                    <Send size={24} className="text-[#54656f] cursor-pointer hover:text-[#41525d]" />
                                </button>
                            ) : (
                                <Mic size={24} className="cursor-pointer hover:text-[#41525d]" />
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-[#f0f2f5] border-b-[6px] border-[#25d366] flex flex-col items-center justify-center text-center p-10">
                    <div className="mb-8">
                        {/* Illustration Placeholder */}
                        <div className="w-[300px] h-[200px] bg-slate-200 rounded-lg flex items-center justify-center text-gray-400">
                            WhatsApp Web Illustration
                        </div>
                    </div>
                    <h1 className="text-3xl font-light text-[#41525d] mb-4">WhatsApp Web</h1>
                    <p className="text-[#667781] text-sm max-w-md leading-6">
                        Send and receive messages without keeping your phone online.<br />
                        Use WhatsApp on up to 4 linked devices and 1 phone.
                    </p>
                    <div className="mt-8 text-xs text-[#8696a0] flex items-center gap-1">
                        <Smartphone size={12} /> End-to-end encrypted
                    </div>
                </div>
            )}
        </div>
    );
};

export default Messages;
