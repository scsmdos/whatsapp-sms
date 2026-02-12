import React, { useState, useEffect } from 'react';
import { FileText, Plus, Copy, MoreHorizontal, X, Trash2, Edit2, Loader2, Check } from 'lucide-react';
import axios from 'axios';

const MessageTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', body: '', category: 'General' });
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        fetchTemplates(true);
    }, []);

    const fetchTemplates = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const response = await axios.get('templates');
            setTemplates(response.data);
        } catch (error) {
            console.error("Error fetching templates:", error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const handleOpenModal = (template = null) => {
        if (template) {
            setEditingId(template.id);
            setFormData({ title: template.title, body: template.body, category: template.category });
        } else {
            setEditingId(null);
            setFormData({ title: '', body: '', category: 'General' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await axios.put(`/api/templates/${editingId}`, formData);
            } else {
                await axios.post('templates', formData);
            }
            await fetchTemplates();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving template:", error);
            alert("Failed to save template.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;
        try {
            await axios.delete(`/api/templates/${id}`);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (error) {
            console.error("Error deleting template:", error);
            alert("Failed to delete template.");
        }
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in font-roboto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Message Templates</h1>
                    <p className="text-gray-500 text-sm">Save time with pre-written messages</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-whatsapp-light text-white rounded-lg hover:bg-green-600 transition-all shadow-md"
                >
                    <Plus size={18} className="mr-2" />
                    New Template
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-whatsapp-teal" size={32} />
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No templates yet. Create your first one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <div key={template.id} className="bg-white rounded-xl shadow-card hover:shadow-lg transition-all border border-gray-100 p-5 group flex flex-col h-full relative">
                            {/* Actions overlay provided by group-hover would be nice, but simple buttons are better for accessibility */}

                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${template.category === 'Marketing' ? 'bg-purple-50 text-purple-600' :
                                    template.category === 'Transactional' ? 'bg-blue-50 text-blue-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {template.category}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(template)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} className="p-1 hover:bg-red-50 rounded text-gray-500 hover:text-red-600" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-2 truncate" title={template.title}>{template.title}</h3>

                            <div className="flex-1 bg-whatsapp-bg/30 p-3 rounded-lg text-sm text-gray-700 leading-relaxed mb-4 font-mono overflow-y-auto max-h-[150px] custom-scrollbar whitespace-pre-wrap">
                                {template.body}
                            </div>

                            <div className="mt-auto flex justify-between items-center border-t border-gray-100 pt-3 text-gray-400 text-xs">
                                <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                                <button
                                    onClick={() => handleCopy(template.body, template.id)}
                                    className={`flex items-center transition-colors ${copiedId === template.id ? 'text-green-600 font-medium' : 'hover:text-whatsapp-teal'}`}
                                >
                                    {copiedId === template.id ? (
                                        <>
                                            <Check size={16} className="mr-1" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} className="mr-1" />
                                            Use
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
                        <section className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                            <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Template' : 'New Template'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </section>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Welcome Message"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none transition-all"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="category-options"
                                        placeholder="e.g. Marketing, Personal, Updates..."
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none transition-all"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    />
                                    <datalist id="category-options">
                                        <option value="General" />
                                        <option value="Marketing" />
                                        <option value="Transactional" />
                                        <option value="Support" />
                                        <option value="Updates" />
                                        {/* Add dynamic categories from existing templates, excluding defaults */}
                                        {[...new Set(templates.map(t => t.category))]
                                            .filter(cat => cat && !["General", "Marketing", "Transactional", "Support", "Updates"].includes(cat))
                                            .map(cat => (
                                                <option key={cat} value={cat} />
                                            ))
                                        }
                                    </datalist>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                                <div className="relative">
                                    <textarea
                                        required
                                        rows="5"
                                        placeholder="Hi {name}, thanks for contacting us..."
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none transition-all font-mono text-sm"
                                        value={formData.body}
                                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    ></textarea>
                                    <p className="text-xs text-gray-500 mt-1">Use <code>{`{name}`}</code> as a placeholder for customer name.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-whatsapp-teal text-white rounded-lg hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md flex items-center"
                                >
                                    {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                                    {editingId ? 'Update Template' : 'Save Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageTemplates;
