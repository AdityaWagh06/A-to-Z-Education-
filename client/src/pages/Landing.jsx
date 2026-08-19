import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Video,
    Users,
    CheckCircle,
    ShieldCheck,
    PlayCircle,
    FileText,
    ArrowRight,
    Youtube,
    MessageCircle,
    ExternalLink,
    GraduationCap,
    TrendingUp,
    Eye,
    X,
    Sparkles
} from 'lucide-react';
import { getGenericErrorMessage, logClientError } from '../lib/errorHandling';
import siteLogo from '../assets/image.png';

const Landing = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginStatusText, setLoginStatusText] = useState('Signing in...');
    const [legalModal, setLegalModal] = useState(null); // 'privacy' | 'terms' | null

    const handleGoogleSuccess = async (response) => {
        try {
            setMessage('');
            setIsLoggingIn(true);
            const authUser = await login(response.credential);
            setLoginStatusText('Login successful! Redirecting to your dashboard...');
            if (authUser?.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/student/home', { replace: true });
            }
        } catch (error) {
            logClientError('Google login failed', error);
            setMessage(getGenericErrorMessage());
            setIsLoggingIn(false);
            setLoginStatusText('');
        }
    };

    // Aligned directly with the 4 core subjects in Subjects.jsx & StudentHome.jsx
    const subjects = [
        {
            name: 'Maths',
            marathiName: 'गणित',
            color: 'bg-blue-50 text-blue-700 border-blue-200',
            badgeBg: 'bg-blue-100 text-blue-800',
            accentBar: 'bg-blue-600',
            iconBg: 'bg-blue-600 text-white',
            desc: 'Master numbers, basic operations, geometry, and problem-solving through step-by-step video lessons and practice tests.',
        },
        {
            name: 'English',
            marathiName: 'इंग्रजी भाषा',
            color: 'bg-pink-50 text-pink-700 border-pink-200',
            badgeBg: 'bg-pink-100 text-pink-800',
            accentBar: 'bg-pink-500',
            iconBg: 'bg-pink-500 text-white',
            desc: 'Grammar fundamentals, vocabulary enrichment, comprehension, and sentence structure for primary and middle school.',
        },
        {
            name: 'Marathi',
            marathiName: 'मराठी व्याकरण व भाषा',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            badgeBg: 'bg-emerald-100 text-emerald-800',
            accentBar: 'bg-emerald-600',
            iconBg: 'bg-emerald-600 text-white',
            desc: 'वर्णविचार, नाम-सर्वनाम, म्हणी, वाक्प्रचार, उतारे व कविता आकलन — मराठी भाषेचे सखोल मार्गदर्शन.',
        },
        {
            name: 'Intelligence',
            marathiName: 'बुद्धिमत्ता चाचणी',
            color: 'bg-purple-50 text-purple-700 border-purple-200',
            badgeBg: 'bg-purple-100 text-purple-800',
            accentBar: 'bg-purple-600',
            iconBg: 'bg-purple-600 text-white',
            desc: 'Logical reasoning, pattern recognition, series, analogy, and competitive scholarship exam preparation.',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-primary selection:text-white">
            {/* Hero Section */}
            <header className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-20 bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 border-b border-slate-200/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                        {/* Left Column: Platform Headline & Google Sign-In */}
                        <div className="lg:col-span-7 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200 mb-6">
                                <GraduationCap size={16} className="text-blue-700" />
                                <span>Interactive Digital Learning Platform</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
                                Empowering Students Through <br className="hidden sm:inline" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                                    Quality Education & Tests
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                वर्गानुसार व विषयवार शैक्षणिक व्हिडिओ, सराव प्रश्नपत्रिका आणि स्पर्धा परीक्षा मार्गदर्शन. 
                                Master <strong>Maths, English, Marathi, and Intelligence</strong> with structured video lessons and practice papers.
                            </p>

                            {/* Prominent Google Sign-In Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200 max-w-md mx-auto lg:mx-0 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-highlight" />
                                
                                <div className="flex items-center justify-center gap-2 mb-1.5 text-slate-900 font-bold text-lg">
                                    <Sparkles size={18} className="text-highlight" />
                                    <span>Sign In to Start Learning</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 mb-5">
                                    Access class-wise lessons and practice test papers with your Google account.
                                </p>

                                {isLoggingIn ? (
                                    <div className="py-4 flex flex-col items-center justify-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full border-3 border-indigo-200 border-t-primary animate-spin" />
                                        <p className="text-xs sm:text-sm font-bold text-slate-800">{loginStatusText}</p>
                                    </div>
                                ) : (
                                    <div className="flex justify-center items-center py-1">
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setMessage(getGenericErrorMessage())}
                                            shape="pill"
                                            theme="outline"
                                            size="large"
                                            text="continue_with"
                                            width="280"
                                        />
                                    </div>
                                )}

                                {message && (
                                    <p className="text-xs text-red-600 mt-3 font-medium bg-red-50 py-1.5 px-3 rounded-lg border border-red-200">
                                        {message}
                                    </p>
                                )}

                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <ShieldCheck size={14} className="text-emerald-600" /> Secure Google Login
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={14} className="text-emerald-600" /> Instant Access
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Authentic Subject Cards Showcase */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <img src={siteLogo} alt="A to Z Education logo" className="h-9 w-9 object-contain" />
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm leading-tight">A to Z Education Platform</h3>
                                            <p className="text-[11px] text-slate-500">4 Core Subjects • Class-wise Lessons</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-primary border border-blue-100">
                                        Student Portal
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {subjects.map((sub) => (
                                        <div
                                            key={sub.name}
                                            className={`p-3.5 rounded-xl border ${sub.color} flex flex-col justify-between transition hover:shadow-xs`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-1.5 rounded-lg ${sub.iconBg}`}>
                                                    <BookOpen size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-sm text-slate-900 leading-tight">{sub.name}</p>
                                                    <p className="text-[10px] text-slate-500 leading-tight">{sub.marathiName}</p>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                                                Video lessons & practice question papers
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-medium flex items-center gap-1">
                                        <Video size={14} className="text-primary" /> Distraction-Free Video Player
                                    </span>
                                    <Link to="/about" className="font-bold text-primary hover:underline flex items-center gap-1">
                                        About Platform <ArrowRight size={13} />
                                    </Link>
                                </div>
                            </div>

                            {/* Direct WhatsApp Community Card */}
                            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                        <MessageCircle size={22} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-xs sm:text-sm">Class WhatsApp Group</p>
                                        <p className="text-[11px] text-slate-600">नियमित class आणि updates साठी ग्रुप लिंक</p>
                                    </div>
                                </div>
                                <a
                                    href="https://chat.whatsapp.com/FtFd5b0qGs3DHKu5xvtUHH?mode=ac_t"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs transition"
                                >
                                    Join <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Verified Learning Resources Strip */}
            <section className="py-8 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-center gap-1.5 text-red-600 mb-1">
                                <PlayCircle size={18} />
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">600+</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">Educational Videos</p>
                            <p className="text-[11px] text-slate-400">Class & topic-wise</p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-1">
                                <Eye size={18} />
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">325,000+</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">Learning Views</p>
                            <p className="text-[11px] text-slate-400">Across learning modules</p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1">
                                <BookOpen size={18} />
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">4 Subjects</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">Maths, English, Marathi, Intelligence</p>
                            <p className="text-[11px] text-slate-400">Standard-wise syllabus</p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-center gap-1.5 text-amber-600 mb-1">
                                <TrendingUp size={18} />
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">3.2M+</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">Community Reach</p>
                            <p className="text-[11px] text-slate-400">Student & parent audience</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Platform Highlights */}
            <section className="py-16 sm:py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary bg-indigo-100 px-3 py-1 rounded-full">
                            Platform Highlights
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
                            Everything You Need for Academic Growth
                        </h2>
                        <p className="text-slate-600 mt-3 text-base sm:text-lg">
                            Simple, clean, and distraction-free tools designed specifically for school students.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1: Video Lessons */}
                        <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5">
                                    <Video size={26} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Curated Video Lessons</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Subject-wise video tutorials explained with step-by-step clarity. Custom player wrapper prevents external YouTube distraction and keeps kids focused on their topic.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-700">
                                <span>Includes Previous & Next Lesson Controls</span>
                            </div>
                        </div>

                        {/* Feature 2: Practice Tests */}
                        <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                                    <FileText size={26} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Practice Tests & Question Papers</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Interactive question papers and test PDFs with downloadable answer keys. Students can practice at their own pace and review solutions easily.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-emerald-700">
                                <span>Secure PDF Viewing & Answer Sheets</span>
                            </div>
                        </div>

                        {/* Feature 3: Dynamic Class Selection */}
                        <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-5">
                                    <Users size={26} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Class-wise Dynamic Learning</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Students can select their class/standard and immediately get access to tailored subject playlists, test papers, and class announcements.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-purple-700">
                                <span>Customized Student Dashboard</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Subject Overview Cards */}
            <section className="py-16 sm:py-20 bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            Subject Curriculum
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
                            The 4 Core Subjects
                        </h2>
                        <p className="text-slate-600 mt-2 text-base">
                            Study material aligned with school curriculum and competitive scholarship exams.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        {subjects.map((sub) => (
                            <div
                                key={sub.name}
                                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                            >
                                <div className={`absolute top-0 left-0 right-0 h-1.5 ${sub.accentBar}`} />
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${sub.iconBg}`}>
                                                <BookOpen size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 leading-tight">{sub.name}</h3>
                                                <p className="text-xs text-slate-500 font-medium">{sub.marathiName}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${sub.badgeBg}`}>
                                            All Standards
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                        {sub.desc}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                                    <span>Curated Lessons & Tests</span>
                                    <span className="flex items-center gap-1 text-primary">
                                        Sign In to Access <ArrowRight size={13} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Official YouTube Channels Section */}
            <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-6 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shrink-0">
                                <Youtube size={28} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-xl leading-tight">Official YouTube Channels</h3>
                                <p className="text-xs sm:text-sm text-slate-300">Free video lessons, concept explanations, and scholarship tips</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <a
                                href="https://www.youtube.com/@atozeducation2001anandwagh"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition group"
                            >
                                <div>
                                    <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">A to Z Education</p>
                                    <p className="text-xs text-slate-300">@atozeducation2001anandwagh • 600+ Videos</p>
                                </div>
                                <ExternalLink size={16} className="text-slate-400 group-hover:text-white" />
                            </a>

                            <a
                                href="https://www.youtube.com/@anandyog2001"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition group"
                            >
                                <div>
                                    <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">Anand Yog Channel</p>
                                    <p className="text-xs text-slate-300">@anandyog2001</p>
                                </div>
                                <ExternalLink size={16} className="text-slate-400 group-hover:text-white" />
                            </a>
                        </div>

                        <p className="text-xs text-slate-400 pt-2 border-t border-white/10 text-center">
                            Over 325,000+ views with high-quality educational videos for students across Maharashtra.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bottom Google CTA Banner */}
            <section className="py-14 bg-gradient-to-r from-primary via-indigo-700 to-primary text-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                        Start Learning with A to Z Education Today
                    </h2>
                    <p className="text-indigo-100 text-sm sm:text-base max-w-xl mx-auto mb-6">
                        Sign in easily with Google to access lessons, class playlists, and practice tests.
                    </p>
                    <div className="inline-block bg-white p-4 rounded-2xl shadow-xl">
                        {isLoggingIn ? (
                            <div className="py-3 px-6 flex items-center justify-center gap-3">
                                <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-primary animate-spin" />
                                <span className="text-xs sm:text-sm font-bold text-slate-800">{loginStatusText}</span>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setMessage(getGenericErrorMessage())}
                                    shape="pill"
                                    theme="outline"
                                    size="large"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Professional Footer */}
            <footer className="bg-slate-900 text-slate-300 pt-14 pb-10 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
                        {/* Column 1: Brand */}
                        <div className="md:col-span-1 space-y-3">
                            <div className="flex items-center gap-2">
                                <img src={siteLogo} alt="A to Z Education" className="w-9 h-9 object-contain bg-white rounded-lg p-1" />
                                <span className="text-lg font-extrabold text-white">A to Z Education</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Empowering students with quality educational videos, test papers, and class-wise study materials.
                            </p>
                        </div>

                        {/* Column 2: Core Subjects */}
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Core Subjects</h4>
                            <ul className="space-y-2 text-xs text-slate-400">
                                <li>Mathematics (गणित)</li>
                                <li>English Language</li>
                                <li>Marathi (मराठी व्याकरण)</li>
                                <li>Intelligence (बुद्धिमत्ता चाचणी)</li>
                                <li>Competitive & Scholarship Prep</li>
                            </ul>
                        </div>

                        {/* Column 3: Platform Links */}
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Quick Links</h4>
                            <ul className="space-y-2 text-xs text-slate-400">
                                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                                <li>
                                    <a
                                        href="https://chat.whatsapp.com/FtFd5b0qGs3DHKu5xvtUHH?mode=ac_t"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-white transition-colors"
                                    >
                                        WhatsApp Class Group
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.youtube.com/@atozeducation2001anandwagh"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-white transition-colors"
                                    >
                                        YouTube Channel
                                    </a>
                                </li>
                                <li><button onClick={() => setLegalModal('privacy')} className="hover:text-white text-left">Privacy Policy</button></li>
                                <li><button onClick={() => setLegalModal('terms')} className="hover:text-white text-left">Terms of Service</button></li>
                            </ul>
                        </div>

                        {/* Column 4: WhatsApp Community */}
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Class Community</h4>
                            <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                Join our active WhatsApp group for daily class notices and study links.
                            </p>
                            <a
                                href="https://chat.whatsapp.com/FtFd5b0qGs3DHKu5xvtUHH?mode=ac_t"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                            >
                                <MessageCircle size={14} /> Join WhatsApp Group
                            </a>
                        </div>
                    </div>

                    {/* Bottom Copyright */}
                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
                        <p>© {new Date().getFullYear()} A to Z Education. All rights reserved.</p>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setLegalModal('privacy')} className="hover:text-slate-400">Privacy Policy</button>
                            <span>•</span>
                            <button onClick={() => setLegalModal('terms')} className="hover:text-slate-400">Terms of Service</button>
                            <span>•</span>
                            <Link to="/about" className="hover:text-slate-400">About AtoZ Education</Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Full-screen Loading Overlay for Login */}
            {isLoggingIn && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-primary animate-spin shadow-xs" />
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">{loginStatusText}</h3>
                            <p className="text-xs text-slate-500 mt-1">Please wait while we log you in and prepare your dashboard.</p>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div className="bg-primary h-full w-2/3 animate-pulse rounded-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Policy & Terms Modal */}
            {legalModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-slate-200">
                        <button
                            onClick={() => setLegalModal(null)}
                            className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                            <X size={20} />
                        </button>

                        {legalModal === 'privacy' ? (
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Privacy Policy</h3>
                                <div className="text-xs sm:text-sm text-slate-600 space-y-3 leading-relaxed">
                                    <p>
                                        At <strong>A to Z Education</strong>, we prioritize the privacy and security of our students and their families. This policy outlines how information is handled.
                                    </p>
                                    <h4 className="font-bold text-slate-900">1. Information We Collect</h4>
                                    <p>
                                        When you sign in via Google OAuth, we receive your name, email address, and profile picture provided by Google. For class customization, your selected class standard and mobile number may be saved.
                                    </p>
                                    <h4 className="font-bold text-slate-900">2. How Information is Used</h4>
                                    <p>
                                        Information is used solely to maintain student test records, track lesson progress, and provide access to study materials. We never sell or share your personal data.
                                    </p>
                                    <h4 className="font-bold text-slate-900">3. Contact</h4>
                                    <p>
                                        For questions, you can reach us via our official channels on WhatsApp or YouTube.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Terms of Service</h3>
                                <div className="text-xs sm:text-sm text-slate-600 space-y-3 leading-relaxed">
                                    <p>
                                        Welcome to <strong>A to Z Education</strong>. By accessing our platform, you agree to comply with the following terms.
                                    </p>
                                    <h4 className="font-bold text-slate-900">1. Educational Use</h4>
                                    <p>
                                        All lessons, video playlists, and question papers are provided for personal educational study and exam preparation.
                                    </p>
                                    <h4 className="font-bold text-slate-900">2. Intellectual Property</h4>
                                    <p>
                                        All curriculum content and materials are created for A to Z Education.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-slate-200 text-right">
                            <button
                                onClick={() => setLegalModal(null)}
                                className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-opacity-90 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Landing;
