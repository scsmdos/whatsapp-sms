import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit, Save, X, Search, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const { user } = useAuth(); // Current logged in user
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('users');
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch users", error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                // Update
                const payload = { ...formData };
                if (!payload.password) delete payload.password; // Don't send empty password on update
                await axios.put(`/api/users/${editingUser.id}`, payload);
                setMessage('User updated successfully');
            } else {
                // Create
                await axios.post('users', formData);
                setMessage('User created successfully');
            }

            setModalOpen(false);
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '' });
            fetchUsers();

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            setMessage('User deleted successfully');
            fetchUsers();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({ name: user.name, email: user.email, password: '' });
        } else {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '' });
        }
        setModalOpen(true);
    };

    return (
        <div className="animate-fade-in font-roboto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                    <p className="text-gray-500 text-sm">Create and manage access for other users</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <UserPlus size={18} />
                    Add New User
                </button>
            </div>

            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex justify-between items-center">
                    {message}
                    <button onClick={() => setMessage('')}><X size={16} /></button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[#f0f2f5] border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Name</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Email (User ID)</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Role</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Joined</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading users...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">No users found. Create one.</td></tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-whatsapp-light text-white flex items-center justify-center font-bold text-xs">
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        {u.name}
                                        {user && user.id === u.id && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">You</span>}
                                    </td>
                                    <td className="p-4 text-gray-600">{u.email}</td>
                                    <td className="p-4 text-gray-500 text-sm">Admin</td>
                                    <td className="p-4 text-gray-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 flex justify-end gap-2">
                                        <button
                                            onClick={() => openModal(u)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(u.id)}
                                            className={`p-2 rounded-lg transition-colors ${user && user.id === u.id ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                            disabled={user && user.id === u.id}
                                            title="Delete User"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f0f2f5]">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingUser ? 'Edit User' : 'Create New User'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-whatsapp-light focus:border-whatsapp-light"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email (User ID)</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-whatsapp-light focus:border-whatsapp-light"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    {...(!editingUser && { required: true })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-whatsapp-light focus:border-whatsapp-light"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    minLength={8}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-whatsapp-teal text-white rounded-lg hover:bg-whatsapp-dark font-medium shadow-sm"
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
