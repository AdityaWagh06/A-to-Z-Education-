import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Bell, ChevronRight, ExternalLink } from 'lucide-react';
import axios from 'axios';

const StudentHome = () => {
    const { user, updateStandard } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [standards, setStandards] = useState([]);
    
    // Static subjects data (could be moved to DB later)
    const subjects = [
        { name: 'Maths', gradient: 'from-blue-500 to-blue-600', icon: <BookOpen className="w-6 h-6" /> },
        { name: 'English', gradient: 'from-pink-500 to-pink-600', icon: <BookOpen className="w-6 h-6" /> },
        { name: 'Marathi', gradient: 'from-green-500 to-green-600', icon: <BookOpen className="w-6 h-6" /> },
        { name: 'Intelligence', gradient: 'from-purple-500 to-purple-600', icon: <BookOpen className="w-6 h-6" /> },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [annRes, stdRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/announcements'),
                    axios.get('http://localhost:5000/api/standards')
                ]);
                setAnnouncements(annRes.data);
                
                let loadedStandards = stdRes.data;
                if (!loadedStandards || loadedStandards.length === 0) {
                     // Fallback standards if DB is empty
                     loadedStandards = [
                        { id: 'def1', value: 1, label: 'Class 1' },
                        { id: 'def2', value: 2, label: 'Class 2' },
                        { id: 'def3', value: 3, label: 'Class 3' },
                        { id: 'def4', value: 4, label: 'Class 4' },
                        { id: 'def5', value: 5, label: 'Class 5' },
                        { id: 'def6', value: 6, label: 'Class 6' },
                        { id: 'def7', value: 7, label: 'Class 7' },
                     ];
                }
                
                const sortedStandards = loadedStandards.sort((a, b) => a.value - b.value);
                setStandards(sortedStandards);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        fetchData();
    }, []);

    const handleStandardSelect = async (stdValue) => {
        try {
            await updateStandard(stdValue);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
                 <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">
                        Welcome, <span className="text-primary">{user?.name}</span>! 👋
                    </h1>
                     {user?.standard && (
                        <div className="text-sm font-medium px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                            Class {user.standard}
                        </div>
                    )}
                 </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8 space-y-10">
                
                {/* 1. Announcements Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
                    </div>
                    
                    {announcements.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {announcements.map((ann) => (
                                <div key={ann._id || ann.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full">
                                     <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                                     <h3 className="font-bold text-gray-900 mb-1 flex items-start justify-between gap-2">
                                        {ann.title}
                                        {ann.link && <ExternalLink size={16} className="text-gray-400 shrink-0 mt-1" />}
                                     </h3>
                                     <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">{ann.description}</p>
                                     <div className="flex justify-between items-center mt-auto">
                                        <span className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString()}</span>
                                        {ann.link && (
                                            <a 
                                                href={ann.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                            >
                                                Learn More <ExternalLink size={12}/>
                                            </a>
                                        )}
                                     </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                            No new notifications at the moment.
                         </div>
                    )}
                </section>

                {/* 2. Classes (Standards) Section */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Classes</h2>
                    <div className="flex flex-wrap gap-3">
                        {standards.length > 0 ? standards.map((std) => {
                            const isActive = user?.standard === std.value;
                            return (
                                <button 
                                    key={std.id}
                                    onClick={() => handleStandardSelect(std.value)}
                                    className={`
                                        group relative overflow-hidden px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 border
                                        ${isActive 
                                            ? 'bg-primary text-white border-primary shadow-lg scale-105' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary hover:shadow-md'}
                                    `}
                                >
                                    {std.label || std.value}
                                </button>
                            );
                        }) : (
                             // Fallback if no standards in DB yet
                             <div className="text-sm text-gray-500 italic">Loading classes...</div>
                        )}
                    </div>
                </section>

                {/* 3. Subjects Grid (Only if Standard is Selected) */}
                {user?.standard && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" /> 
                                Your Subjects 
                                <span className="text-sm font-normal text-gray-500 ml-2">(Class {user.standard})</span>
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {subjects.map((sub) => (
                                <Link 
                                    to={`/student/lessons/${sub.name.toLowerCase()}?standard=${user.standard}`} 
                                    key={sub.name} 
                                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 overflow-hidden transform hover:-translate-y-1 block"
                                >
                                    <div className={`h-24 bg-gradient-to-r ${sub.gradient} flex items-center justify-center`}>
                                        <div className="bg-white/20 p-3 rounded-full text-white backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                                            {sub.icon}
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-gray-800 mb-1">{sub.name}</h3>
                                        <div className="flex items-center text-primary text-sm font-medium group-hover:underline">
                                            Start Learning <ChevronRight className="w-4 h-4 ml-1" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {!user?.standard && standards.length > 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">Please select your class from the list above to view subjects.</p>
                    </div>
                )}
                
                <div className="flex justify-center mt-12 pb-8">
                     <Link to="/student/profile" className="text-gray-500 hover:text-primary font-bold text-sm flex items-center gap-2 px-6 py-3 rounded-full hover:bg-white border border-transparent hover:border-gray-200 transition shadow-sm hover:shadow-md">
                         View Your Progress Report
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default StudentHome;
