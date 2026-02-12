import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWhatsApp } from '../context/WhatsAppContext';
import {
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    Users,
    FolderOpen,
    MessageCircle,
    FileText,
    Send,
    PieChart,
    Settings,
    User,
    ChevronDown,
    Smartphone
} from 'lucide-react';
import logo from '../assets/logo.png';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const { connectionStatus } = useWhatsApp();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'WhatsApp', path: '/whatsapp', icon: Smartphone, showStatus: true },
        { name: 'Contacts', path: '/contacts', icon: Users },
        { name: 'Contact Groups', path: '/contact-groups', icon: FolderOpen },
        { name: 'Messages', path: '/messages', icon: MessageCircle },
        { name: 'Templates', path: '/templates', icon: FileText },
        { name: 'Campaigns', path: '/campaigns', icon: Send },
        { name: 'Analytics', path: '/analytics', icon: PieChart },
        { name: 'Users', path: '/users', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    const isConnected = connectionStatus === 'connected' || connectionStatus === 'ready';

    return (
        <div className="flex h-screen bg-[#e9edef] font-roboto text-sm">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar - Compact Width (w-56) */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-200 transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Sidebar Header - Matches Main Header Height/Color */}
                <div className="flex items-center justify-between h-14 px-3 bg-[#f0f2f5] border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full shadow-sm overflow-hidden flex items-center justify-center bg-white">
                            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-base font-bold text-gray-800 tracking-tight">SMS Secure</span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation - Unified List */}
                <nav className="p-2 space-y-0.5 overflow-y-auto h-[calc(100vh-3.5rem)] bg-white">
                    <div className="mt-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center px-3 py-2 rounded-md text-sm font-normal transition-colors ${isActive
                                        ? 'bg-[#f0f2f5] text-whatsapp-teal border-l-2 border-whatsapp-light'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`
                                }
                            >
                                <item.icon size={18} className={`mr-3 ${({ isActive }) => isActive ? 'text-whatsapp-teal' : 'text-gray-400'}`} />
                                <span className={({ isActive }) => isActive ? 'font-medium' : ''}>{item.name}</span>
                                {item.showStatus && (
                                    <span className={`ml-auto flex items-center`}>
                                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                                            }`}></span>
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#e9edef]">

                {/* Top Header - Matches Sidebar Header (h-14, bg-[#f0f2f5]) */}
                <header className="flex items-center justify-between px-4 h-14 bg-[#f0f2f5] border-b border-gray-200 shadow-sm z-10 w-full">
                    <div className="flex items-center">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="mr-3 text-gray-500 md:hidden hover:text-gray-700 focus:outline-none"
                        >
                            <Menu size={20} />
                        </button>

                        {/* Dynamic Welcome Message */}
                        <div className="flex flex-col">
                            <h2 className="text-sm font-semibold text-gray-800">
                                Hello, <span className="text-whatsapp-teal">{user?.name || 'Admin'}</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center space-x-2 focus:outline-none hover:bg-gray-200 p-1.5 rounded-lg transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-whatsapp-light flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                                </div>
                                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                                    {user?.name || 'Admin User'}
                                </span>
                                <ChevronDown size={14} className={`text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100 z-50 animate-fade-in origin-top-right">
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <p className="text-xs text-gray-500">Signed in as</p>
                                        <p className="text-sm font-semibold text-gray-800 truncate">{user?.email || 'admin@example.com'}</p>
                                    </div>

                                    <NavLink
                                        to="/settings"
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setProfileOpen(false)}
                                    >
                                        <User size={16} className="mr-2 text-gray-400" />
                                        My Profile
                                    </NavLink>

                                    <button
                                        onClick={() => {
                                            setProfileOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                                    >
                                        <LogOut size={16} className="mr-2" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto p-4 relative z-0">
                    <div className="mx-auto max-w-6xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
