import { useRef, useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Spinner, LoadingOverlay } from './Spinner';
import { AuthProgress, RequestStatus } from './NetworkStatus';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const clearRegistrationState = ({ setStep, setGoogleCredential, setName, setMobile, setStandard, setAuthError, setSuccessMessage }) => {
    setStep('initial');
    setGoogleCredential(null);
    setName('');
    setMobile('');
    setStandard(null);
    setAuthError('');
    setSuccessMessage('');
};

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
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingStandards, setIsLoadingStandards] = useState(false);
    const [networkStatus, setNetworkStatus] = useState('online');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setStep('initial');
            setGoogleCredential(null);
            setName('');
            setMobile('');
            setStandard(null);
            setAuthError('');
            setIsLoading(false);
            setSuccessMessage('');
            return;
        }

        if (defaultTab === 'login') {
            setStep('initial');
        }

        // Setup network status listener
        const handleOnline = () => setNetworkStatus('online');
        const handleOffline = () => setNetworkStatus('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [defaultTab, isOpen]);

    useEffect(() => {
        const fetchStandards = async () => {
            setIsLoadingStandards(true);
            try {
                const { data } = await axios.get(`${API_URL}/api/standards`, {
                    timeout: 5000
                });
                const sorted = (Array.isArray(data) ? data : []).sort((a, b) => Number(a.value) - Number(b.value));
                setStandards(sorted);
            } catch (error) {
                console.warn('Failed to fetch standards:', error.message);
                // Fallback to default standards
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
            } finally {
                setIsLoadingStandards(false);
            }
        };

        if (isOpen) fetchStandards();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGoogleSuccess = async (response) => {
        try {
            setAuthError('');
            setIsLoading(true);
            
            if (defaultTab === 'register') {
                const payload = parseJwt(response.credential);
                if (payload) {
                    setName(payload.name || '');
                }
                setGoogleCredential(response.credential);
                setSuccessMessage('Google account verified! Fill in your details.');
                setStep('details');
            } else {
                setSuccessMessage('Logging in...');
                await login(response.credential, {}, 'login');
                setSuccessMessage('Login successful! Redirecting...');
                setTimeout(() => {
                    onClose();
                    navigate('/student/home', { replace: true });
                }, 500);
            }
        } catch (error) {
            console.error('Login failed', error);
            setAuthError(error?.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        setSuccessMessage('');
        
        if (!googleCredential) {
            setAuthError('Google session expired. Please click Register with Google again.');
            setStep('initial');
            return;
        }
        if (!standard) {
            setAuthError('Please select your standard.');
            return;
        }

        setIsLoading(true);
        try {
            setSuccessMessage('Creating your account...');
            await login(googleCredential, { name, mobile, standard: Number(standard) }, 'register');
            setSuccessMessage('Account created successfully! Redirecting...');
            setTimeout(() => {
                onClose();
                navigate('/student/home', { replace: true });
                // Reset state
                setStep('initial');
                setGoogleCredential(null);
                setName('');
                setMobile('');
                setStandard(null);
                setSuccessMessage('');
            }, 500);
        } catch (error) {
            console.error('Registration failed', error);
            setAuthError(error?.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
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
            <LoadingOverlay 
                isLoading={isLoading && !successMessage}
                message="Authenticating..."
            />
            
            <div 
                ref={modalRef}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200"
            >
                {/* Auth Progress Indicator */}
                {step === 'details' && (
                    <AuthProgress 
                        currentStep={2} 
                        totalSteps={2}
                        stepLabels={['Verify with Google', 'Complete Profile']}
                    />
                )}

                {/* Network Status Indicator */}
                {networkStatus === 'offline' && (
                    <div className="bg-red-50 border-b border-red-200 px-8 py-3 flex items-center gap-2">
                        <AlertCircle size={18} className="text-red-600" />
                        <span className="text-sm text-red-700">You're offline. Some features may not work.</span>
                    </div>
                )}

                {/* Header */}
                <div className="px-8 mt-5 pb-4 border-b border-gray-100 flex justify-between items-center text-center">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {step === 'details' ? 'Complete Your Profile' : (defaultTab === 'login' ? 'Welcome Back!' : 'Start Learning')}
                    </h2>
                    <button 
                        onClick={() => { onClose(); setStep('initial'); }}
                        disabled={isLoading}
                        className={`p-2 rounded-full transition-colors text-gray-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 flex flex-col items-center">
                    {/* Success Message */}
                    {successMessage && (
                        <div className="w-full mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
                            <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                            <span className="text-sm text-green-700">{successMessage}</span>
                        </div>
                    )}

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

                            {isLoading ? (
                                <div className="w-full flex flex-col items-center gap-4 py-8">
                                    <Spinner size="lg" />
                                    <p className="text-gray-600 text-center">Authenticating with Google...</p>
                                </div>
                            ) : (
                                <div className="w-full flex justify-center mb-6">
                                    <div className="transform scale-110">
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setAuthError('Google Login Failed')}
                                            width="300"
                                            theme="filled_blue"
                                            shape="pill"
                                            text={defaultTab === 'login' ? 'signin_with' : 'signup_with'}
                                            logo_alignment="left"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleDetailsSubmit} className="w-full">
                            <p className="text-gray-600 text-center mb-6">
                                Just a few more details to create your account.
                            </p>
                            {authError && (
                                <p className="text-sm text-red-600 text-center mb-4 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    {authError}
                                </p>
                            )}
                            
                            <div className="w-full mb-6 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        required
                                        disabled={isLoading}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        disabled={isLoading}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Standard
                                        {isLoadingStandards && <Spinner size="sm" className="inline ml-2" />}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {standards.map((std) => {
                                            const value = Number(std.value);
                                            const selected = Number(standard) === value;
                                            return (
                                                <button
                                                    key={std.id || std.value}
                                                    type="button"
                                                    onClick={() => setStandard(value)}
                                                    disabled={isLoading}
                                                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-700'}`}
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
                                disabled={isLoading}
                                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner size="sm" />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Complete Registration'
                                )}
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