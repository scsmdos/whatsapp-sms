import React, { useEffect, useState } from 'react';
import { FolderOpen, Plus, MoreVertical, Users, Trash, Loader } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ContactGroups = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroupData, setNewGroupData] = useState({ groupName: '', contactName: '', contactPhone: '' });
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const colors = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-yellow-100 text-yellow-800',
        'bg-pink-100 text-pink-800',
        'bg-indigo-100 text-indigo-800'
    ];

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const { data } = await axios.get('contacts');
            const groupCounts = {};

            // Calculate counts
            data.forEach(contact => {
                const groupName = contact.group || 'Uncategorized';
                groupCounts[groupName] = (groupCounts[groupName] || 0) + 1;
            });

            // Convert to array
            const calculatedGroups = Object.keys(groupCounts).map((name, index) => ({
                id: index,
                name,
                count: groupCounts[name],
                color: colors[index % colors.length]
            }));

            setGroups(calculatedGroups);
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewGroup = (groupName) => {
        // Navigate to contacts with query param
        navigate(`/contacts?group=${encodeURIComponent(groupName)}`);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader className="animate-spin text-whatsapp-teal" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in font-roboto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Contact Groups</h1>
                    <p className="text-gray-500 text-sm">Organize your audience segments</p>
                </div>
                {/* Manual Group Creation Removed as per user request */}
            </div>

            {groups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No groups found. Add contacts to create groups automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            onClick={() => handleViewGroup(group.name)}
                            className="bg-white rounded-xl shadow-card p-6 border border-gray-100 relative group hover:shadow-lg transition-all cursor-pointer"
                        >
                            <div className="flex items-center space-x-4 mb-4">
                                <div className={`p-3 rounded-xl ${group.color}`}>
                                    <FolderOpen size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                                    <span className="text-xs text-gray-400">Auto-generated</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Users size={16} className="mr-2" />
                                    <span>{group.count} Contacts</span>
                                </div>
                                <button className="text-whatsapp-teal text-sm font-medium hover:underline">View All</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactGroups;
