import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, BookOpen, Home, BarChart } from 'lucide-react';
import { useState } from 'react';
import AuthModal from './AuthModal';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const openLogin = () => {
        setAuthMode('login');
        setAuthModalOpen(true);
    };

    const openRegister = () => {
        setAuthMode('register');
        setAuthModalOpen(true);
    };

    return (
        <>
            <nav className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex-shrink-0 flex items-center gap-2 text-primary">
                                <BookOpen className="h-8 w-8" />
                                <span className="font-extrabold text-xl tracking-tight">A to Z Education</span>
                            </Link>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            {user?.role === 'student' && (
                                <div className="hidden md:flex items-center gap-6">
                                    <Link to="/student/home" className="text-gray-600 hover:text-primary font-medium flex items-center gap-1 transition-colors">
                                        <Home size={18}/> Home
                                    </Link>
                                    <Link to="/student/subjects" className="text-gray-600 hover:text-primary font-medium flex items-center gap-1 transition-colors">
                                        <BookOpen size={18}/> Subjects
                                    </Link>
                                    <Link to="/student/profile" className="text-gray-600 hover:text-primary font-medium flex items-center gap-1 transition-colors">
                                        <User size={18}/> Profile
                                    </Link>
                                </div>
                            )}
                            {user?.role === 'admin' && (
                                <div className="hidden md:flex items-center gap-6">
                                    <Link to="/admin/dashboard" className="text-gray-600 hover:text-primary font-medium flex items-center gap-1 transition-colors">
                                        <BarChart size={18}/> Dashboard
                                    </Link>
                                </div>
                            )}
                            
                            {user ? (
                                <div className="flex items-center gap-3 pl-6 border-l ml-2">
                                    <div className="hidden md:block text-right mr-2">
                                        <p className="text-sm font-bold text-gray-800 leading-none">{user?.name}</p>
                                        <p className="text-xs text-gray-500 uppercase">{user?.role}</p>
                                    </div>
                                    
                                    {user?.picture ? (
                                        <img 
                                            src={user.picture} 
                                            alt={user.name} 
                                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                                            {user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleLogout} 
                                        className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2"
                                    >
                                        <LogOut size={16}/> <span className="hidden md:inline">Logout</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={openLogin}
                                        className="px-6 py-2 rounded-md font-bold text-primary border border-primary hover:bg-primary/5 transition"
                                    >
                                        Login
                                    </button>
                                    <button 
                                        onClick={openRegister}
                                        className="px-6 py-2 rounded-md font-bold bg-primary text-white hover:bg-opacity-90 transition shadow-md hover:shadow-lg"
                                    >
                                        Register
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            <AuthModal 
                isOpen={authModalOpen} 
                onClose={() => setAuthModalOpen(false)} 
                defaultTab={authMode} 
            />
        </>
    );
};

export default Navbar;
