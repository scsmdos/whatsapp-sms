import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, CheckCircle2, XCircle, Plus, MoreVertical, Play, Trash2, Users, Copy, Pause, StopCircle, Terminal, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Campaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState({ name: '', template_body: '', contact_count: 0, media: null, target_group: 'All Contacts' });
    const [groups, setGroups] = useState([]);
    const { user } = useAuth();

    // Runner State
    const [runnerModalOpen, setRunnerModalOpen] = useState(false);
    const [activeCampaign, setActiveCampaign] = useState(null);
    const [runStats, setRunStats] = useState({ sent: 0, failed: 0, total: 0, processed: 0 });
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const processingRef = useRef(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            processingRef.current = false;
        };
    }, []);

    // Fetch Campaigns
    const fetchCampaigns = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const response = await axios.get('campaigns');
            setCampaigns(response.data);
        } catch (error) {
            console.error("Error fetching campaigns:", error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns(true);
    }, []);

    // Fetch unique contact groups
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const response = await axios.get('contacts');
                const uniqueGroups = [...new Set(response.data.map(c => c.group).filter(Boolean))];
                setGroups(['All Contacts', ...uniqueGroups]);
            } catch (error) {
                console.error("Error fetching groups:", error);
            }
        };
        fetchGroups();
    }, []);

    // Create Campaign
    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', newCampaign.name);
            formData.append('template_body', newCampaign.template_body);
            formData.append('target_group', newCampaign.target_group);
            if (newCampaign.media) {
                formData.append('media', newCampaign.media);
            }

            await axios.post('campaigns', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setIsCreateModalOpen(false);
            setNewCampaign({ name: '', template_body: '', contact_count: 0, media: null, target_group: 'All Contacts' });
            fetchCampaigns();
        } catch (error) {
            console.error("Error creating campaign:", error);
            alert("Failed to create campaign.");
        }
    };

    // Duplicate Campaign
    const handleDuplicate = async (id) => {
        if (!window.confirm("Duplicate this campaign?")) return;
        try {
            await axios.post(`/api/campaigns/${id}/duplicate`);
            fetchCampaigns();
        } catch (error) {
            console.error("Error duplicating:", error);
            alert("Failed to duplicate.");
        }
    };

    // Delete Campaign
    const handleDeleteCampaign = async (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
        try {
            await axios.delete(`/api/campaigns/${id}`);
            fetchCampaigns();
        } catch (error) {
            console.error("Error deleting campaign:", error);
        }
    };

    // --- RUNNER LOGIC ---

    const openRunner = (campaign) => {
        setActiveCampaign(campaign);
        setRunnerModalOpen(true);
        setIsRunning(false);
        processingRef.current = false;
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Ready to start campaign: ${campaign.name}`]);

        // Initialize stats
        const total = campaign.messages_count || 0;
        const sent = campaign.sent_count || 0;
        // Approximation of failures not typically tracked in simple view, but can be derived
        setRunStats({
            total: total,
            sent: sent,
            failed: 0,
            processed: sent
        });
    };

    const toggleExecution = () => {
        if (isRunning) {
            setIsRunning(false);
            processingRef.current = false;
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏸ Paused execution.`]);
        } else {
            setIsRunning(true);
            processingRef.current = true;
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ▶ Starting execution batch...`]);
            processNextBatch();
        }
    };

    const processNextBatch = async () => {
        if (!processingRef.current || !activeCampaign) return;

        try {
            const res = await axios.post(`/api/campaigns/${activeCampaign.id}/send-batch`, { batch_size: 5 });

            if (res.data.completed) {
                setIsRunning(false);
                processingRef.current = false;
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Campaign Completed Successfully!`]);
                fetchCampaigns();
                return;
            }

            const { processed, details } = res.data;

            // Update Stats
            setRunStats(prev => ({
                ...prev,
                sent: prev.sent + details.filter(d => d.status === 'sent').length,
                failed: prev.failed + details.filter(d => d.status === 'failed' || d.status === 'error').length,
                processed: prev.processed + processed
            }));

            // Add Logs
            details.forEach(d => {
                setLogs(prev => {
                    const newLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${d.status === 'sent' ? '✅ Data sent' : '❌ Failed'}: ${d.phone}`];
                    return newLogs.slice(-50); // Keep last 50 lines
                });
            });

            // Loop
            if (processingRef.current) {
                setTimeout(processNextBatch, 1500); // 1.5s delay between batches for safety
            }

        } catch (error) {
            console.error("Batch error:", error);
            setIsRunning(false);
            processingRef.current = false;
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔴 Critical Error: ${error.message}`]);
        }
    };

    const closeRunner = () => {
        if (isRunning) {
            if (!window.confirm("Campaign is running. Close viewer? (Background process will stop)")) return;
        }
        setIsRunning(false);
        processingRef.current = false;
        setRunnerModalOpen(false);
        setLogs([]);
        fetchCampaigns();
    };

    // Helper
    const getProgress = (campaign) => {
        const total = campaign.messages_count || 0;
        const sent = campaign.sent_count || 0;
        return { total, sent, percent: total > 0 ? Math.round((sent / total) * 100) : 0 };
    };

    return (
        <div className="space-y-6 animate-fade-in font-roboto relative">
            {/* Create Campaign Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg animate-scale-in">
                        <section className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Create New Campaign</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={20} />
                            </button>
                        </section>
                        <form onSubmit={handleCreateCampaign} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Diwali Sale Blast"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Message Template</label>
                                <textarea
                                    required
                                    rows="4"
                                    placeholder="Hello {name}, check out our new offers!"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none resize-none"
                                    value={newCampaign.template_body}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, template_body: e.target.value })}
                                />
                                <p className="text-xs text-gray-400 mt-1">Use <code>{'{name}'}</code> for dynamic customer names.</p>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Campaign Media (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) => setNewCampaign({ ...newCampaign, media: e.target.files[0] })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none text-sm"
                                />
                                {newCampaign.media && (
                                    <div className="mt-2 flex items-center text-xs text-green-600">
                                        <CheckCircle2 size={14} className="mr-1" />
                                        {newCampaign.media.name} ({(newCampaign.media.size / 1024 / 1024).toFixed(2)} MB)
                                    </div>
                                )}
                            </div>

                            {/* Target Group Selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                                <select
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none text-sm"
                                    value={newCampaign.target_group}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, target_group: e.target.value })}
                                    required
                                >
                                    {groups.map((group) => (
                                        <option key={group} value={group}>
                                            {group}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    <Users size={12} className="inline mr-1" />
                                    Campaign will be sent to contacts in this group only
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-whatsapp-teal text-white rounded-lg hover:bg-green-700 font-medium">Create Campaign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Campaigns</h1>
                    <p className="text-gray-500 text-sm">Manage your bulk messaging activities</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-whatsapp-light text-white rounded-lg hover:bg-green-600 transition-all shadow-md"
                >
                    <Plus size={18} className="mr-2" />
                    New Campaign
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                            <th className="p-4 font-medium">Campaign Name</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Progress</th>
                            <th className="p-4 font-medium">Created Date</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading campaigns...</td></tr>
                        ) : campaigns.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">No campaigns found. Create one to get started!</td></tr>
                        ) : (
                            campaigns.map((camp) => {
                                const progress = getProgress(camp);
                                return (
                                    <tr key={camp.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-900">{camp.name}</div>
                                            <div className="text-xs text-gray-400">ID: #{camp.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${camp.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                camp.status === 'active' || camp.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>
                                                {camp.status}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {/* Mock Progress Bar since real counts might be 0 initially */}
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[140px]">
                                                <div
                                                    className={`h-2.5 rounded-full ${camp.status === 'completed' ? 'bg-whatsapp-light' :
                                                        ('active' === camp.status || 'processing' === camp.status) ? 'bg-blue-500' : 'bg-gray-400'
                                                        }`}
                                                    style={{ width: `${progress.percent}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 font-mono">
                                                {progress.sent} / {progress.total}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <Clock size={14} className="mr-1 text-gray-400" />
                                                {new Date(camp.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => openRunner(camp)}
                                                    className="p-1.5 text-whatsapp-teal bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                                    title={camp.status === 'completed' ? "Restart/Resume" : "Run Campaign"}
                                                >
                                                    <Play size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicate(camp.id)}
                                                    className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                                                    title="Duplicate"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCampaign(camp.id)}
                                                    className="p-1.5 text-red-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
                <div className="p-4 border-t border-gray-200">
                    <button className="w-full py-2 text-sm text-gray-500 hover:text-gray-900 font-medium">View All History</button>
                </div>
            </div>

            {/* RUNNER MODAL (PREMIUM UI) */}
            {runnerModalOpen && activeCampaign && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900 bg-opacity-90 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#1e1e1e] text-gray-200 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
                        {/* Title Bar */}
                        <div className="h-14 border-b border-gray-700 flex justify-between items-center px-6 bg-[#252526]">
                            <div className="flex items-center gap-3">
                                <Terminal size={20} className="text-blue-400" />
                                <h3 className="font-mono font-bold text-white">Target-Term: {activeCampaign.name}</h3>
                            </div>
                            <button onClick={closeRunner} className="hover:text-white text-gray-400 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Status Dashboard */}
                        <div className="grid grid-cols-4 gap-4 p-6 bg-[#1e1e1e]">
                            <div className="bg-[#2d2d2d] p-4 rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
                                <div className="text-2xl font-bold text-white mt-1">{runStats.total}</div>
                            </div>
                            <div className="bg-[#2d2d2d] p-4 rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Sent</span>
                                <div className="text-2xl font-bold text-green-400 mt-1">{runStats.sent}</div>
                            </div>
                            <div className="bg-[#2d2d2d] p-4 rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Failed</span>
                                <div className="text-2xl font-bold text-red-400 mt-1">{runStats.failed}</div>
                            </div>
                            <div className="bg-[#2d2d2d] p-4 rounded-lg border border-gray-700 flex items-center justify-center">
                                <button
                                    onClick={toggleExecution}
                                    className={`w-full h-full flex items-center justify-center rounded-lg font-bold transition-all ${isRunning ? 'bg-red-500/20 text-red-400 border border-red-500 hover:bg-red-500/30' :
                                        'bg-green-500/20 text-green-400 border border-green-500 hover:bg-green-500/30'
                                        }`}
                                >
                                    {isRunning ? <><Pause className="mr-2" /> PAUSE</> : <><Play className="mr-2" /> {runStats.processed > 0 ? 'RESUME' : 'START'}</>}
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-6 mb-4">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Progress</span>
                                <span>{Math.round((runStats.processed / runStats.total) * 100) || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                                    style={{ width: `${(runStats.processed / runStats.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Terminal Logs */}
                        <div className="flex-1 bg-[#000000] mx-6 mb-6 rounded-lg border border-gray-700 p-4 font-mono text-sm overflow-y-auto custom-scrollbar shadow-inner">
                            {logs.length === 0 && <div className="text-gray-500 italic">Ready to initialize... Click Start.</div>}
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1 text-gray-300 border-b border-gray-800/50 pb-1 last:border-0">
                                    {log}
                                </div>
                            ))}
                            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Campaigns;
