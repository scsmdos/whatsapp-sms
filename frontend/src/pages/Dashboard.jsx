import React, { useState, useEffect } from 'react';
import { Users, Send, CheckCircle, AlertCircle, TrendingUp, BarChart2, ArrowUpRight, Plus, Zap, FileText } from 'lucide-react';
import { useWhatsApp } from '../context/WhatsAppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Standardized Premium Card Component
const StatCard = ({ title, value, subtext, icon: Icon, colorClass, gradientClass }) => (
    <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 hover:shadow-lg transition-all duration-300 group cursor-default relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-24 h-24 ${gradientClass} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>

        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800 font-sans tracking-tight">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100 shadow-sm group-hover:scale-105 transition-transform`}>
                <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
            </div>
        </div>

        <div className="mt-3 flex items-center text-[10px] font-medium text-gray-400">
            <span className="text-green-500 bg-green-50 px-1.5 py-0.5 rounded flex items-center mr-2">
                <ArrowUpRight size={10} className="mr-0.5" /> 12%
            </span>
            <span>{subtext}</span>
        </div>
    </div>
);

const Dashboard = () => {
    const { connectionStatus } = useWhatsApp();
    const isConnected = connectionStatus === 'connected' || connectionStatus === 'ready';
    const navigate = useNavigate();

    // Dynamic Stats State
    const [stats, setStats] = useState({
        sentMessages: 0,
        successRate: 0,
        failedMessages: 0,
        totalContacts: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, chartRes] = await Promise.all([
                    axios.get('dashboard/stats'), // Assumes route exists
                    axios.get('dashboard/chart-data') // Assumes route exists
                ]);

                setStats(statsRes.data);
                setChartData(chartRes.data);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-4 animate-fade-in font-roboto text-sm p-1">
            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Sent Messages"
                    value={loading ? "..." : stats.sentMessages.toLocaleString()}
                    subtext="Successfully Sent"
                    icon={Send}
                    colorClass="bg-blue-500"
                    gradientClass="bg-blue-500"
                />
                <StatCard
                    title="Success Rate"
                    value={loading ? "..." : `${stats.successRate}%`}
                    subtext="Delivery Performance"
                    icon={CheckCircle}
                    colorClass="bg-green-500"
                    gradientClass="bg-green-500"
                />
                <StatCard
                    title="Failed"
                    value={loading ? "..." : stats.failedMessages}
                    subtext="Invalid Numbers / Errors"
                    icon={AlertCircle}
                    colorClass="bg-red-500"
                    gradientClass="bg-red-500"
                />
                <StatCard
                    title="Total Contacts"
                    value={loading ? "..." : stats.totalContacts.toLocaleString()}
                    subtext="Audience Size"
                    icon={Users}
                    colorClass="bg-purple-500"
                    gradientClass="bg-purple-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Enhanced Chart Section */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 flex items-center">
                                <BarChart2 size={16} className="mr-2 text-whatsapp-teal" />
                                Traffic Overview (Last 7 Days)
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Message delivery performance over time</p>
                        </div>
                    </div>

                    {/* Modern Bar Chart Visual */}
                    <div className="h-48 flex items-end justify-between gap-3 px-2">
                        {loading ? (
                            <div className="w-full text-center text-gray-400 text-xs">Loading chart data...</div>
                        ) : chartData.length === 0 ? (
                            <div className="w-full text-center text-gray-400 text-xs">No activity yet. Send a campaign!</div>
                        ) : (
                            chartData.map((d, i) => {
                                // Normalize height relative to max value (avoid excessive height for 0)
                                const maxVal = Math.max(...chartData.map(c => c.messages), 10);
                                const h = (d.messages / maxVal) * 100;

                                return (
                                    <div key={i} className="w-full relative group h-full flex items-end flex-col justify-end">
                                        <div
                                            style={{ height: `${h}%` }}
                                            className={`w-full rounded-t-md transition-all duration-500 relative overflow-hidden min-h-[4px] ${d.date === new Date().toLocaleDateString('en-US', { weekday: 'short' })
                                                ? 'bg-gradient-to-t from-whatsapp-dark to-whatsapp-teal shadow-lg shadow-green-200'
                                                : 'bg-gray-100 hover:bg-gray-200'
                                                }`}
                                        >
                                        </div>
                                        <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center w-full">
                                            {d.date}
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-all shadow-xl z-10 whitespace-nowrap pointer-events-none">
                                            {d.messages} msgs
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Status & Actions */}
                <div className="space-y-4">
                    {/* Premium Status Widget */}
                    <div className={`p-5 rounded-xl border relative overflow-hidden transition-all ${isConnected
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                        : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100'
                        }`}>
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <h3 className={`text-sm font-bold flex items-center ${isConnected ? 'text-green-800' : 'text-red-800'}`}>
                                <Zap size={14} className="mr-1.5" />
                                System Status
                            </h3>
                            <span className={`flex h-2.5 w-2.5 relative`}>
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </span>
                        </div>

                        <div className="relative z-10">
                            <p className="text-xs text-gray-600 mb-3 leading-relaxed font-medium opacity-80">
                                {isConnected
                                    ? 'Gateway active. Messages are processing normally.'
                                    : 'Gateway offline. Please scan QR code to resume.'}
                            </p>
                            {!isConnected && (
                                <button
                                    onClick={() => navigate('/whatsapp')}
                                    className="w-full py-2 bg-gray-900 text-white text-xs rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all font-medium flex items-center justify-center group"
                                >
                                    Connect Device
                                    <ArrowUpRight size={12} className="ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Launch Buttons */}
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                            <Plus size={16} className="mr-2 text-whatsapp-teal" />
                            Quick Actions
                        </h3>
                        <div className="space-y-2.5">
                            {[
                                { name: 'New Campaign', icon: Send, color: 'text-blue-500', bg: 'bg-blue-50', path: '/campaigns' },
                                { name: 'Add Contacts', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50', path: '/contacts' },
                                { name: 'Create Template', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50', path: '/templates' }
                            ].map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(action.path)}
                                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all border border-transparent hover:border-gray-100 group"
                                >
                                    <div className="flex items-center text-gray-700 text-xs font-semibold group-hover:text-gray-900">
                                        <div className={`p-1.5 rounded-md ${action.bg} ${action.color} mr-3 group-hover:scale-110 transition-transform`}>
                                            <action.icon size={14} />
                                        </div>
                                        {action.name}
                                    </div>
                                    <div className="text-gray-300 text-[10px] group-hover:text-whatsapp-teal opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                                        OPEN
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
