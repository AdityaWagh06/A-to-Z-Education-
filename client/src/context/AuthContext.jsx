import { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Auth retry configuration
const RETRY_ATTEMPTS = 1;
const RETRY_DELAY = 500; // ms

// Error types that are retryable
const RETRYABLE_ERRORS = [
  'Network request failed',
  'Fetch failed',
  'timeout',
  'ECONNREFUSED',
  'ETIMEDOUT',
];

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authSource, setAuthSource] = useState('none');
  
  // Use ref to track component mounted state and prevent race conditions
  const isMountedRef = useRef(true);
  const authListenerRef = useRef(null);
  const storageListenerRef = useRef(null);

  const persistUser = (nextUser) => {
    if (nextUser) {
      try {
        localStorage.setItem('authUser', JSON.stringify(nextUser));
      } catch (error) {
        console.warn('Failed to persist user to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('authUser');
      } catch (error) {
        console.warn('Failed to clear authUser from localStorage:', error);
      }
    }
    setUser(nextUser);
  };

  /**
   * Check if error is retryable (network issue, not auth error)
   */
  const isRetryableError = (error) => {
    if (!error) return false;
    const message = error?.message?.toLowerCase() || '';
    const status = error?.response?.status;
    // Don't retry 401/403 (auth errors)
    if (status === 401 || status === 403) return false;
    // Retry network errors
    return RETRYABLE_ERRORS.some(err => message.includes(err.toLowerCase()));
  };

  /**
   * Retry a function with exponential backoff
   */
  const retryAsync = async (fn, attempts = RETRY_ATTEMPTS) => {
    let lastError;
    for (let i = 0; i <= attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error) || i === attempts) {
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
      }
    }
    throw lastError;
  };

  /**
   * Hydrate auth state on mount with retry logic
   */
  const hydrateAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const cachedUserRaw = localStorage.getItem('authUser');
      const cachedUser = cachedUserRaw ? JSON.parse(cachedUserRaw) : null;

      // Start with cached user if available (instant UX)
      if (cachedUser && isMountedRef.current) {
        setUser(cachedUser);
        setAuthSource('cached');
      }

      // Try backend session first (JWT token)
      if (token && isMountedRef.current) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const res = await retryAsync(() =>
            axios.get(`${API_URL}/api/auth/profile`, { timeout: 5000 })
          );

          if (isMountedRef.current) {
            persistUser(res.data);
            setAuthSource('backend');
            setLoading(false);
          }
          return;
        } catch (error) {
          const status = Number(error?.response?.status || 0);
          // Only clear token on explicit auth errors
          if (status === 401 || status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('authUser');
            delete axios.defaults.headers.common['Authorization'];
            if (isMountedRef.current) {
              persistUser(null);
              setAuthSource('none');
            }
          } else {
            // For other errors, keep cached user and try Supabase
            console.warn('Backend profile fetch failed (will try Supabase):', error.message);
          }
        }
      }

      // Fallback to Supabase session
      if (hasSupabaseConfig && supabase && isMountedRef.current) {
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }

          const sessionUser = data?.session?.user;
          if (sessionUser && isMountedRef.current) {
            // Check if this is a different user (multi-user scenario)
            const shouldUpdate = !user || user._id !== sessionUser.id;
            
            if (shouldUpdate) {
              persistUser({
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
          console.warn('Supabase session fetch failed:', error.message);
        }
      }
    } catch (error) {
      console.error('Auth hydration failed:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Handle storage changes from other tabs
   */
  const handleStorageChange = (event) => {
    if (event.key === 'authUser' && isMountedRef.current) {
      try {
        const newAuthUser = event.newValue ? JSON.parse(event.newValue) : null;
        
        // Update state if auth changed in another tab
        if (!newAuthUser && user) {
          // User logged out in another tab
          persistUser(null);
          setAuthSource('none');
          localStorage.removeItem('token');
        } else if (newAuthUser && (!user || user._id !== newAuthUser._id)) {
          // Different user logged in another tab
          persistUser(newAuthUser);
          setAuthSource('storage');
        }
      } catch (error) {
        console.warn('Failed to handle storage change:', error);
      }
    } else if (event.key === 'token' && isMountedRef.current) {
      // Token changed in another tab
      const newToken = event.newValue;
      if (!newToken && localStorage.getItem('token')) {
        // Token cleared in another tab, sync here
        axios.defaults.headers.common['Authorization'] = undefined;
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Hydrate auth state
    hydrateAuth();

    // 2. Setup Supabase auth listener (single listener only)
    if (hasSupabaseConfig && supabase && !authListenerRef.current) {
      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMountedRef.current) return;

        const sessionUser = session?.user;
        
        // Prevent overwriting state if session belongs to another tab/device
        // by comparing user IDs
        if (sessionUser) {
          const shouldUpdate = !user || user._id !== sessionUser.id;
          
          if (shouldUpdate) {
            persistUser({
              _id: sessionUser.id,
              name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Student',
              email: sessionUser.email,
              role: 'student',
              standard: null,
            });
            setAuthSource('supabase');
          }
        } else if (user) {
          // Only clear if we currently have a user
          persistUser(null);
          setAuthSource('none');
        }
      });

      authListenerRef.current = listener.data.subscription;
    }

    // 3. Setup storage listener for multi-tab sync
    if (typeof window !== 'undefined') {
      storageListenerRef.current = handleStorageChange;
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      isMountedRef.current = false;
      
      // Cleanup auth listener
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
        authListenerRef.current = null;
      }
      
      // Cleanup storage listener
      if (storageListenerRef.current && typeof window !== 'undefined') {
        window.removeEventListener('storage', storageListenerRef.current);
        storageListenerRef.current = null;
      }
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
    persistUser(res.data);
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
      persistUser({
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
      persistUser({
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
    localStorage.removeItem('authUser');
    delete axios.defaults.headers.common['Authorization'];
    if (authSource === 'supabase' && hasSupabaseConfig && supabase) {
      supabase.auth.signOut();
    }
    persistUser(null);
    setAuthSource('none');
  };

  const updateProfile = async (payload = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please login first');
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const res = await axios.put(`${API_URL}/api/auth/profile`, payload);
    persistUser({ ...(user || {}), ...res.data });
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
    localStorage.removeItem('authUser');
    delete axios.defaults.headers.common['Authorization'];
    persistUser(null);
    setAuthSource('none');
  };

  return (
    <AuthContext.Provider value={{ user, login, hasSupabaseConfig, logout, loading, updateStandard, updateProfile, deleteAccount, signUpWithPassword, signInWithPassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
