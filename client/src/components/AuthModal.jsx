import { useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const modalRef = useRef(null);

    if (!isOpen) return null;

    const handleGoogleSuccess = async (response) => {
        try {
            await login(response.credential);
            onClose();
            navigate('/student/home', { replace: true });
        } catch (error) {
            console.error('Login failed', error);
            // Ideally show error in modal, but for now log it
            alert('Login failed. Please try again.');
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
                        {defaultTab === 'login' ? 'Welcome Back!' : 'Start Learning'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                    
                </div>

                {/* Body */}
                <div className="p-8 flex flex-col items-center">
                    <p className="text-gray-600 text-center mb-8">
                        {defaultTab === 'login' 
                            ? 'Login to access your courses and track progress.' 
                            : 'Join thousands of students achieving their goals.'}
                    </p>

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

                    <div className="w-full border-t border-gray-100 pt-6 text-center">
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