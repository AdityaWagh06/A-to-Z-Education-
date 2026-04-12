import { useRef, useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const modalRef = useRef(null);
    const [step, setStep] = useState('initial'); // 'initial', 'details'
    const [googleCredential, setGoogleCredential] = useState(null);
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [standard, setStandard] = useState(null);
    const [standards, setStandards] = useState([]);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setStep('initial');
            setGoogleCredential(null);
            setName('');
            setMobile('');
            setStandard(null);
            setAuthError('');
            return;
        }

        if (defaultTab === 'login') {
            setStep('initial');
        }
    }, [defaultTab, isOpen]);

    useEffect(() => {
        const fetchStandards = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/standards`);
                const sorted = (Array.isArray(data) ? data : []).sort((a, b) => Number(a.value) - Number(b.value));
                setStandards(sorted);
            } catch {
                setStandards([
                    { id: 's2', value: 2, label: 'Standard 2' },
                    { id: 's3', value: 3, label: 'Standard 3' },
                    { id: 's4', value: 4, label: 'Standard 4' },
                    { id: 's5', value: 5, label: 'Standard 5' },
                    { id: 's6', value: 6, label: 'Standard 6' },
                    { id: 's7', value: 7, label: 'Standard 7' },
                    { id: 's8', value: 8, label: 'Standard 8' },
                    { id: 's9', value: 9, label: 'Standard 9' },
                    { id: 's10', value: 10, label: 'Standard 10' },
                ]);
            }
        };

        if (isOpen) fetchStandards();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGoogleSuccess = async (response) => {
        try {
            setAuthError('');
            if (defaultTab === 'register') {
                const payload = parseJwt(response.credential);
                if (payload) {
                    setName(payload.name || '');
                }
                setGoogleCredential(response.credential);
                setStep('details');
            } else {
                await login(response.credential, {}, 'login');
                onClose();
                navigate('/student/home', { replace: true });
            }
        } catch (error) {
            console.error('Login failed', error);
            setAuthError(error?.response?.data?.message || 'Login failed. Please try again.');
        }
    };

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        if (!googleCredential) {
            setAuthError('Google session expired. Please click Sign up with Google again.');
            setStep('initial');
            return;
        }
        if (!standard) {
            setAuthError('Please select your standard.');
            return;
        }
        try {
            await login(googleCredential, { name, mobile, standard: Number(standard) }, 'register');
            onClose();
            navigate('/student/home', { replace: true });
            // Reset state
            setStep('initial');
            setGoogleCredential(null);
            setName('');
            setMobile('');
            setStandard(null);
        } catch (error) {
            console.error('Registration failed', error);
            setAuthError(error?.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    const handleOverlayClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleOverlayClick}
        >
            <div 
                ref={modalRef}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="px-8 mt-5 pb-4 border-b border-gray-100 flex justify-between items-center text-center">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {step === 'details' ? 'Complete Your Profile' : (defaultTab === 'login' ? 'Welcome Back!' : 'Start Learning')}
                    </h2>
                    <button 
                        onClick={() => { onClose(); setStep('initial'); }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                    
                </div>

                {/* Body */}
                <div className="p-8 flex flex-col items-center">
                    {step === 'initial' ? (
                        <>
                            <p className="text-gray-600 text-center mb-8">
                                {defaultTab === 'login' 
                                    ? 'Login to access your courses and track progress.' 
                                    : 'Join thousands of students achieving their goals.'}
                            </p>
                            {defaultTab === 'login' && (
                                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mb-5 text-center">
                                    New user? Please click Register first to create your account.
                                </p>
                            )}

                            <div className="w-full flex justify-center mb-6">
                                <div className="transform scale-110"> {/* Scale up button slightly */}
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => alert('Google Login Failed')}
                                        width="300"
                                        theme="filled_blue"
                                        shape="pill"
                                        text={defaultTab === 'login' ? 'signin_with' : 'signup_with'}
                                        logo_alignment="left"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleDetailsSubmit} className="w-full">
                            <p className="text-gray-600 text-center mb-6">
                                Just a few more details to create your account.
                            </p>
                            {authError && (
                                <p className="text-sm text-red-600 text-center mb-4">{authError}</p>
                            )}
                            
                            <div className="w-full mb-6 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                    <input
                                        type="tel"
                                        placeholder="Mobile Number"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Standard</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {standards.map((std) => {
                                            const value = Number(std.value);
                                            const selected = Number(standard) === value;
                                            return (
                                                <button
                                                    key={std.id || std.value}
                                                    type="button"
                                                    onClick={() => setStandard(value)}
                                                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-700'}`}
                                                >
                                                    {std.label || `Standard ${value}`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition shadow-md"
                            >
                                Complete Sign Up
                            </button>
                        </form>
                    )}

                    <div className="w-full border-t border-gray-100 pt-6 text-center mt-4">
                        {step === 'initial' && authError && (
                            <p className="text-sm text-red-600 mb-3">{authError}</p>
                        )}
                        <p className="text-sm text-gray-500">
                            By continuing, you agree to our{' '}
                            <a href="#" className="text-primary hover:underline">Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;