import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let result;
            if (isLogin) {
                result = await login(formData.email, formData.password);
            } else {
                result = await register(formData.name, formData.email, formData.password);
            }

            if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card p-8 animate-fade-in">
            {/* Logo */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
                    <MessageSquare size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Bulk WhatsApp</h1>
                <p className="text-gray-600 mt-1">
                    {isLogin ? 'Sign in to your account' : 'Create a new account'}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-danger-light border border-danger rounded-lg">
                    <p className="text-sm text-danger-dark">{error}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                        </label>
                        <div className="relative">
                            <User
                                size={18}
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input pl-10"
                                placeholder="Enter your name"
                                autoComplete="name"
                                required={!isLogin}
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                    </label>
                    <div className="relative">
                        <Mail
                            size={18}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="input pl-10"
                            placeholder="Enter your email"
                            autoComplete="username email"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <div className="relative">
                        <Lock
                            size={18}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="input pl-10 pr-10"
                            placeholder="Enter your password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full mt-6"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {isLogin ? 'Signing in...' : 'Creating account...'}
                        </span>
                    ) : (
                        <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    )}
                </button>
            </form>

            {/* Toggle Login/Register */}

        </div>
    );
};

export default Login;
