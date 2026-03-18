import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const StudentHome = () => {
    const { user, updateStandard } = useAuth();
    
    // Static data with gradients to look vibrant
    const subjects = [
        { name: 'Maths', gradient: 'from-blue-400 to-blue-600', icon: <BookOpen />, progress: 45 },
        { name: 'English', gradient: 'from-pink-400 to-pink-600', icon: <BookOpen />, progress: 20 },
        { name: 'Marathi', gradient: 'from-green-400 to-green-600', icon: <BookOpen />, progress: 60 },
        { name: 'Intelligence', gradient: 'from-purple-400 to-purple-600', icon: <BookOpen />, progress: 10 },
    ];

    const handleStandardSelect = async (std) => {
        try {
            await updateStandard(std);
        } catch (err) {
            console.error(err);
        }
    };

    if (!user?.standard) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 text-center">
                    Welcome, <span className="text-primary">{user?.name}</span>! 👋
                </h1>
                <p className="text-xl text-gray-600 mb-12 text-center">Select your standard to get started</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 w-full max-w-6xl">
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((std) => (
                        <button 
                            key={std}
                            onClick={() => handleStandardSelect(std)}
                            className="group bg-white hover:bg-indigo-600 border-2 border-gray-100 hover:border-indigo-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center justify-center aspect-square"
                        >
                            <span className="text-7xl font-black text-gray-800 group-hover:text-white mb-2 transition-colors">{std}</span>
                            <span className="text-lg text-gray-500 group-hover:text-indigo-100 font-bold uppercase tracking-wider transition-colors">Standard</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header / Welcome Banner */}
            <div className="bg-gradient-to-r from-primary to-indigo-600 text-white p-8 md:p-12 mb-12 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-extrabold mb-2">
                            Standard {user?.standard}
                        </h1>
                        <p className="text-lg opacity-90 font-medium">
                            Let's learn something new today! 🚀
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/10 p-2 pr-6 rounded-full backpack-blur-sm border border-white/20">
                        <span className="bg-white text-primary font-bold w-10 h-10 flex items-center justify-center rounded-full text-lg">
                            {user?.standard}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-wide opacity-80">Current Class</span>
                            <button 
                                onClick={() => updateStandard(null)}
                                className="text-sm font-bold hover:text-yellow-300 transition text-left"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                {/* Subjects Grid */}
                <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                    <BookOpen className="text-primary h-8 w-8" /> Select a Subject
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {subjects.map((sub) => (
                        <Link to={`/student/lessons/${sub.name.toLowerCase()}?standard=${user?.standard || ''}`} key={sub.name} className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-2">
                             <div className={`h-32 bg-gradient-to-br ${sub.gradient} flex items-center justify-center relative`}>
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                                <div className="bg-white/25 p-5 rounded-2xl text-white backdrop-blur-md shadow-inner transform group-hover:scale-110 transition-transform duration-300">
                                    {sub.icon}
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">{sub.name}</h3>
                                <p className="text-gray-500 text-sm font-medium">View Lessons & Tests →</p>
                            </div>
                        </Link>
                    ))}
                </div>
                
                <div className="flex justify-center mt-12">
                    <Link to="/student/profile" className="text-gray-500 hover:text-primary font-bold text-sm flex items-center gap-2 px-6 py-3 rounded-full hover:bg-gray-100 transition">
                         View Your Progress Report
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default StudentHome;
