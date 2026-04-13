import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Video, Award, Users, CheckCircle } from 'lucide-react';

const Landing = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [message, setMessage] = useState('');

    const handleGoogleSuccess = async (response) => {
        try {
            setMessage('');
            await login(response.credential);
            navigate('/student/home', { replace: true });
        } catch (error) {
            console.error('Google login failed', error);
            setMessage(error?.response?.data?.message || 'Google login failed. Please try again.');
        }
    };

    const Feature = ({ icon, title, desc }) => (
        <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-transform hover:-translate-y-1">
            <div className="bg-blue-100 p-4 rounded-full mb-4 text-primary">{icon}</div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
            <p className="text-gray-600">{desc}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
                <div>
                    <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm mb-4 inline-block">
                        Trusted by 10,000+ Students
                    </span>
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                        Make Learning <br /> <span className="text-primary">Fun & Easy</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-lg">
                        Master Maths, English, Marathi, and Intelligence Tests with interactive video lessons and quizzes.
                    </p>

                    <Link
                        to="/about"
                        className="group mb-5 block bg-white p-4 rounded-lg shadow-md border border-blue-200 max-w-[440px] hover:shadow-lg transition"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">About Us</p>
                        <h3 className="text-lg font-bold text-gray-900 mt-1">AtoZ Education - Anand Wagh</h3>
                        <p className="text-sm text-gray-600 mt-1">Know more about our mission, author, and class resources.</p>
                        <span className="inline-flex items-center mt-2 text-sm font-semibold text-primary group-hover:underline">View About Page</span>
                    </Link>

                    <div className="bg-white p-4 rounded-lg shadow-xl border w-full max-w-[420px]">
                        <p className="font-semibold text-center text-gray-700 mb-3">Continue with Google</p>
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setMessage('Google login popup failed.')}
                                shape="pill"
                                theme="outline"
                                size="large"
                            />
                        </div>
                        {message && <p className="text-xs text-center text-red-600 mt-3">{message}</p>}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> Secure Google Sign-In</span>
                        <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> Instant Access</span>
                    </div>
                </div>

                <div className="relative hidden md:block">
                    <img
                        src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1600&auto=format&fit=crop"
                        alt="Student Learning"
                        className="relative z-10 w-full rounded-2xl shadow-2xl"
                    />
                </div>
            </header>

            <section id="features" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12 text-gray-800">Why Choose A to Z Education?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Feature icon={<Video size={32} />} title="Interactive Video Lessons" desc="High-quality lessons for each standard and subject." />
                        <Feature icon={<Users size={32} />} title="Class-wise Learning" desc="Study from 2nd to 5th standard with subject filtering." />
                        <Feature icon={<Award size={32} />} title="Test-Focused Tracking" desc="Track your test attempts and accuracy in one profile view." />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Landing;
