import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, BookOpen, Home, BarChart, ChevronDown, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import AuthModal from './AuthModal';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                                <div className="relative" ref={dropdownRef}>
                                    <button 
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center gap-3 pl-6 border-l ml-3 focus:outline-none hover:opacity-80 transition-opacity"
                                    >
                                        <div className="hidden md:block text-right">
                                            <p className="text-sm font-bold text-gray-800 leading-none">{user?.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold mt-0.5 tracking-wider">{user?.role}</p>
                                        </div>
                                        
                                        <div className="relative">
                                            {user?.picture ? (
                                                <img 
                                                    src={user.picture} 
                                                    alt={user.name} 
                                                    className="h-9 w-9 rounded-full object-cover border border-gray-200 shadow-sm"
                                                />
                                            ) : (
                                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-sm">
                                                    {user?.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                                <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute right-0 mt-3 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                                                <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                                            </div>
                                            
                                            <div className="py-1">
                                                {user?.role === 'student' && (
                                                    <Link 
                                                        to="/student/profile" 
                                                        className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-primary flex items-center gap-3 transition-colors group"
                                                        onClick={() => setIsDropdownOpen(false)}
                                                    >
                                                        <User size={16} className="text-gray-400 group-hover:text-primary transition-colors" /> 
                                                        My Profile
                                                    </Link>
                                                )}
                                                
                                                {user?.role === 'admin' ? (
                                                     <Link 
                                                        to="/admin/dashboard" 
                                                        className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-primary flex items-center gap-3 transition-colors group"
                                                        onClick={() => setIsDropdownOpen(false)}
                                                    >
                                                        <BarChart size={16} className="text-gray-400 group-hover:text-primary transition-colors" /> 
                                                        Admin Dashboard
                                                    </Link>
                                                ) : (
                                                    <Link 
                                                        to="/student/home" 
                                                        className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-primary flex items-center gap-3 transition-colors group"
                                                        onClick={() => setIsDropdownOpen(false)}
                                                    >
                                                        <Home size={16} className="text-gray-400 group-hover:text-primary transition-colors" /> 
                                                        Go to Home
                                                    </Link>
                                                )}
                                            </div>
                                            
                                            <div className="border-t border-gray-100 pt-1 mt-1">
                                                <button 
                                                    onClick={() => {
                                                        handleLogout();
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium group"
                                                >
                                                    <LogOut size={16} className="text-red-400 group-hover:text-red-600 transition-colors" /> 
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
