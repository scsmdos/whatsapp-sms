import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Upload, FileDown, MoreVertical, User, Edit } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const Contacts = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', phone: '', group: 'Customers' });
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null); // ID of contact with open menu
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const { user } = useAuth();

    // Group Filtering
    const location = useLocation();
    const [groupFilter, setGroupFilter] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const g = params.get('group');
        setGroupFilter(g || '');
    }, [location]);

    // Fetch Contacts from Backend
    const fetchContacts = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const response = await axios.get('/api/contacts');
            setContacts(response.data);
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts(true);
    }, []);

    // Add or Edit Contact
    const handleAddContact = async (e) => {
        e.preventDefault();
        try {
            // Ensure we append the 91 prefix
            const payload = {
                ...newContact,
                phone: '91' + newContact.phone
            };

            if (isEditMode && editId) {
                await axios.put(`/api/contacts/${editId}`, payload);
            } else {
                await axios.post('/api/contacts', payload);
            }

            setIsAddModalOpen(false);
            setNewContact({ name: '', phone: '', group: 'Customers' });
            setIsEditMode(false);
            setEditId(null);
            fetchContacts(); // Refresh list
        } catch (error) {
            console.error("Error saving contact:", error);
            alert("Failed to save contact. Please check your input.");
        }
    };

    // Import Contacts from CSV
    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) {
            alert('Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const response = await axios.post('/api/contacts/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setImportResult(response.data);
            setImportFile(null);
            fetchContacts(); // Refresh list

            // Auto-close modal after 3 seconds if successful
            if (response.data.success) {
                setTimeout(() => {
                    setIsImportModalOpen(false);
                    setImportResult(null);
                }, 3000);
            }
        } catch (error) {
            console.error('Error importing contacts:', error);
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to import contacts. Please check file format.';
            alert(msg);
        }
    };

    // Delete Contact(s)
    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) return;

        try {
            await axios.post('/api/contacts/bulk-delete', { ids: selectedContacts });
            setSelectedContacts([]);
            fetchContacts();
        } catch (error) {
            console.error("Error deleting contacts:", error);
            alert("Failed to delete contacts.");
        }
    };

    const handleDeleteOne = async (id) => {
        if (!window.confirm("Are you sure you want to delete this contact?")) return;
        try {
            await axios.delete(`/api/contacts/${id}`);
            fetchContacts();
            setActiveMenu(null);
        } catch (error) {
            console.error("Error deleting contact:", error);
            alert("Failed to delete contact.");
        }
    };

    const handleEdit = (contact) => {
        // Strip 91 if present for the input field
        const simplePhone = contact.phone.startsWith('91') ? contact.phone.substring(2) : contact.phone;
        setNewContact({
            name: contact.name,
            phone: simplePhone,
            group: contact.group
        });
        setEditId(contact.id);
        setIsEditMode(true);
        setActiveMenu(null);
        setIsAddModalOpen(true);
    };

    // Filter Logic
    const filteredContacts = contacts.filter(contact =>
        (contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.includes(searchTerm)) &&
        (!groupFilter || contact.group === groupFilter)
    );

    const toggleSelectAll = () => {
        if (selectedContacts.length === filteredContacts.length) setSelectedContacts([]);
        else setSelectedContacts(filteredContacts.map(c => c.id));
    };

    const toggleSelect = (id) => {
        if (selectedContacts.includes(id)) setSelectedContacts(selectedContacts.filter(cid => cid !== id));
        else setSelectedContacts([...selectedContacts, id]);
    };

    return (
        <div className="space-y-2 animate-fade-in relative">
            {/* Add Contact Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md animate-scale-in">
                        <section className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{isEditMode ? 'Edit Contact' : 'Add New Contact'}</h2>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); setNewContact({ name: '', phone: '', group: 'Customers' }); }} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </section>
                        <form onSubmit={handleAddContact} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Phone (with country code)</label>
                                <div className="flex rounded-lg shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium select-none">
                                        +91
                                    </span>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        placeholder="9876543210"
                                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-whatsapp-teal outline-none sm:text-sm"
                                        value={newContact.phone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, ''); // Ensure only numbers
                                            setNewContact({ ...newContact, phone: val });
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Group</label>
                                {isCreatingGroup ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                            placeholder="Enter new group name"
                                            value={newContact.group}
                                            onChange={(e) => setNewContact({ ...newContact, group: e.target.value })}
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setIsCreatingGroup(false); setNewContact({ ...newContact, group: 'Customers' }); }}
                                            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-200 text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                        value={newContact.group}
                                        onChange={(e) => {
                                            if (e.target.value === '_create_new_') {
                                                setIsCreatingGroup(true);
                                                setNewContact({ ...newContact, group: '' });
                                            } else {
                                                setNewContact({ ...newContact, group: e.target.value });
                                            }
                                        }}
                                    >
                                        {/* Merge default groups with any unique groups existing in contacts */}
                                        {[...new Set(['Customers', 'Leads', 'Friends', 'Family', ...contacts.map(c => c.group).filter(Boolean)])].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                        <option value="_create_new_" className="font-bold text-whatsapp-teal bg-green-50">
                                            + Create New Group
                                        </option>
                                    </select>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-whatsapp-teal text-white rounded-lg hover:bg-green-700">
                                    {isEditMode ? 'Update Contact' : 'Save Contact'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import CSV Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
                        <section className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Import Contacts from CSV</h2>
                            <button onClick={() => { setIsImportModalOpen(false); setImportResult(null); }} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </section>

                        <form onSubmit={handleImport} className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                                <p className="text-blue-800 font-medium mb-2">📋 CSV Format:</p>
                                <code className="text-xs block bg-white p-2 rounded border">
                                    Name,Phone,Group,Email<br />
                                    John Doe,919876543210,Customers<br />
                                    Jane Smith,918765432109,Leads
                                </code>
                                <p className="text-blue-600 text-xs mt-2">
                                    💡 Only Name & Phone required
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Select CSV File</label>
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                />
                                {importFile && (
                                    <p className="text-xs text-green-600 mt-1">✓ {importFile.name}</p>
                                )}
                            </div>

                            {importResult && (
                                <div className="p-3 rounded-lg text-sm bg-green-50 border border-green-200">
                                    <p className="font-medium text-green-800">{importResult.message}</p>
                                    <div className="text-green-700 text-xs mt-2">
                                        <p>✅ Imported: {importResult.imported}</p>
                                        <p>⚠️ Duplicates: {importResult.duplicates}</p>
                                        <p>❌ Errors: {importResult.errors}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setIsImportModalOpen(false); setImportResult(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-whatsapp-teal text-white rounded-lg hover:bg-green-700">Import</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Unified Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                {/* Title */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Contacts</h1>
                    <p className="text-sm text-gray-500">Manage your audience list</p>
                </div>

                {/* Search Bar - Centered/Inline */}
                <div className="flex flex-1 max-w-2xl mx-4 items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-light focus:border-transparent transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {groupFilter && (
                        <div className="flex-shrink-0 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 flex items-center gap-2 animate-fade-in shadow-sm whitespace-nowrap">
                            <span className="font-semibold">Group:</span> {groupFilter}
                            <button
                                onClick={() => setGroupFilter('')}
                                className="p-0.5 hover:bg-blue-100 rounded-full text-blue-500 hover:text-blue-800 transition-colors"
                                title="Clear filter"
                            >
                                <span className="text-lg leading-none font-bold">&times;</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {selectedContacts.length > 0 && (
                        <button onClick={handleDelete} className="flex items-center px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm text-sm font-medium">
                            <Trash2 size={16} className="mr-1.5" />
                            Delete ({selectedContacts.length})
                        </button>
                    )}
                    <button onClick={() => setIsImportModalOpen(true)} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium">
                        <Upload size={16} className="mr-1.5" />
                        Import CSV
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center px-3 py-2 bg-whatsapp-light text-white rounded-lg hover:bg-green-600 transition-colors shadow-md text-sm font-medium">
                        <Plus size={16} className="mr-1.5" />
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Contacts Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-180px)]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-whatsapp-light focus:ring-whatsapp-light"
                                        checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Phone Number</th>
                                <th className="p-4 font-semibold">Group</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading contacts...</td></tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No contacts found.</td></tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-whatsapp-light focus:ring-whatsapp-light"
                                                checked={selectedContacts.includes(contact.id)}
                                                onChange={() => toggleSelect(contact.id)}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-whatsapp-bg flex items-center justify-center text-whatsapp-teal font-bold mr-3">
                                                    {contact.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-900">{contact.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600 font-mono text-sm">{contact.phone}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${contact.group === 'Customers' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                contact.group === 'Leads' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                    'bg-purple-50 text-purple-700 border-purple-200'
                                                }`}>
                                                {contact.group}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(contact); }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Contact"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteOne(contact.id); }}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Contact"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Static) */}
                <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-500">Showing {filteredContacts.length} contacts</span>
                    <div className="flex space-x-2">
                        <button className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Previous</button>
                        <button className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm text-gray-600 hover:bg-gray-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contacts;
