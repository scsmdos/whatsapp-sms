import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            // Set axios default header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Verify token and get user
            fetchUser();
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setLoading(false);
        }

        // Add interceptor to handle 401 global logout
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    console.warn("401 Unauthorized - preventing auto-logout for debugging");
                    // logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await axios.get('auth/me');
            setUser(response.data.user);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            // logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post('auth/login', { email, password });
            // API return structure: { access_token, user, ... }
            const { access_token: newToken, user: userData } = response.data;

            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(userData);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const register = async (name, email, password) => {
        try {
            const response = await axios.post('auth/register', { name, email, password });
            const { access_token: newToken, user: userData } = response.data;

            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(userData);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    const value = {
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
