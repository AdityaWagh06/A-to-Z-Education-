import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authSource, setAuthSource] = useState('none');

    useEffect(() => {
        let isMounted = true;

        const hydrateAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    try {
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        const res = await axios.get(`${API_URL}/api/auth/profile`);
                        if (isMounted) {
                            setUser(res.data);
                            setAuthSource('backend');
                        }
                        return;
                    } catch {
                        localStorage.removeItem('token');
                        delete axios.defaults.headers.common['Authorization'];
                    }
                }

                if (hasSupabaseConfig && supabase) {
                    const { data } = await supabase.auth.getSession();
                    const sessionUser = data?.session?.user;
                    if (sessionUser && isMounted) {
                        setUser({
                            _id: sessionUser.id,
                            name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Student',
                            email: sessionUser.email,
                            role: 'student',
                            standard: null,
                        });
                        setAuthSource('supabase');
                    }
                }
            } catch (error) {
                console.error('Auth hydration failed:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        hydrateAuth();

        let sub;
        if (hasSupabaseConfig && supabase) {
            const listener = supabase.auth.onAuthStateChange((_event, session) => {
                const sessionUser = session?.user;
                if (sessionUser) {
                    setUser({
                        _id: sessionUser.id,
                        name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Student',
                        email: sessionUser.email,
                        role: 'student',
                        standard: null,
                    });
                    setAuthSource('supabase');
                } else {
                    setUser(null);
                    setAuthSource('none');
                }
            });
            sub = listener.data.subscription;
        }

        return () => {
            isMounted = false;
            if (sub) sub.unsubscribe();
        };
    }, []);

    const login = async (googleToken, extraData = {}, mode = 'login') => {
        const res = await axios.post(`${API_URL}/api/auth/google`, { 
            token: googleToken,
            ...extraData,
            mode,
        });
        localStorage.setItem('token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        setUser(res.data);
        setAuthSource('backend');
        return res.data;
    };

    const signUpWithPassword = async ({ name, email, password }) => {
        if (!hasSupabaseConfig || !supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name || email.split('@')[0]
                }
            }
        });

        if (error) {
            throw error;
        }

        if (data?.session?.user) {
            setUser({
                _id: data.session.user.id,
                name: data.session.user.user_metadata?.full_name || email.split('@')[0],
                email: data.session.user.email,
                role: 'student',
                standard: null,
            });
            setAuthSource('supabase');
            return { requiresEmailVerification: false };
        }

        return { requiresEmailVerification: true };
    };

    const signInWithPassword = async ({ email, password }) => {
        if (!hasSupabaseConfig || !supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        if (data?.user) {
            setUser({
                _id: data.user.id,
                name: data.user.user_metadata?.full_name || email.split('@')[0],
                email: data.user.email,
                role: 'student',
                standard: null,
            });
            setAuthSource('supabase');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        if (authSource === 'supabase' && hasSupabaseConfig && supabase) {
            supabase.auth.signOut();
        }
        setUser(null);
        setAuthSource('none');
    };

    const updateProfile = async (payload = {}) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login first');
        }

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await axios.put(`${API_URL}/api/auth/profile`, payload);
        setUser((prev) => ({ ...prev, ...res.data }));
        return res.data;
    };

    const updateStandard = async (standard) => {
        return updateProfile({ standard });
    };

    const deleteAccount = async (payload) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login first');
        }

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await axios.delete(`${API_URL}/api/auth/account`, { data: payload });
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setAuthSource('none');
    };

    return (
        <AuthContext.Provider value={{ user, login, hasSupabaseConfig, logout, loading, updateStandard, updateProfile, deleteAccount }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
