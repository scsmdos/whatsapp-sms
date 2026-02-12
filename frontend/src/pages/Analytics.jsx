import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const Analytics = () => {
    const [analyticsData, setAnalyticsData] = useState({
        totalMessages: 0,
        deliveryRate: 0,
        failedRate: 0,
        responseRate: 0,
        weeklyData: [],
        pieData: [],
        totalContacts: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await axios.get('/api/analytics');
                setAnalyticsData(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
                setError("Failed to load analytics data.");
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-whatsapp-green" size={48} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-full text-red-500">
                {error}
            </div>
        );
    }

    const { totalMessages, deliveryRate, failedRate, responseRate, weeklyData, pieData, totalContacts } = analyticsData;

    return (
        <div className="space-y-8 animate-fade-in font-roboto">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
                <p className="text-gray-500">Deep dive into your campaign performance</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-card border-t-4 border-whatsapp-light">
                    <p className="text-gray-500 text-sm font-medium">Total Messages</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalMessages.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-card border-t-4 border-blue-400">
                    <p className="text-gray-500 text-sm font-medium">Delivery Rate</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{deliveryRate}%</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-card border-t-4 border-purple-400">
                    <p className="text-gray-500 text-sm font-medium">Total Contacts</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalContacts.toLocaleString()}</h3>
                </div>
                {/* <div className="bg-white p-6 rounded-xl shadow-card border-t-4 border-purple-400">
                    <p className="text-gray-500 text-sm font-medium">Response Rate</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{responseRate}%</h3>
                </div> */}
                <div className="bg-white p-6 rounded-xl shadow-card border-t-4 border-red-400">
                    <p className="text-gray-500 text-sm font-medium">Failed Rate</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{failedRate}%</h3>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-card">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Weekly Performance</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f0fdf4' }} />
                                <Legend />
                                <Bar dataKey="Sent" fill="#FBBC05" name="Pending" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Delivered" fill="#25D366" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Failed" fill="#EA4335" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-card">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Status Breakdown</h3>
                    <div className="h-64 w-full flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
