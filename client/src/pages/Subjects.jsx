import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Subjects = () => {
    const { user } = useAuth();
    // Subject definition
    const subjects = [
        { name: 'Maths', color: 'bg-blue-100 text-blue-600', icon: <BookOpen className="w-8 h-8" /> },
        { name: 'English', color: 'bg-red-100 text-red-600', icon: <BookOpen className="w-8 h-8" /> },
        { name: 'Marathi', color: 'bg-green-100 text-green-600', icon: <BookOpen className="w-8 h-8" /> },
        { name: 'Intelligence', color: 'bg-yellow-100 text-yellow-600', icon: <BookOpen className="w-8 h-8" /> },
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
             <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Learn by Subject</h1>
                     <p className="text-gray-500 mt-2">Standard: <span className="font-semibold">{user?.standard || 'Not selected'}</span>. Choose a subject to view lessons and tests.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subjects.map((sub) => (
                    <div key={sub.name} className="bg-white rounded-card shadow-lg overflow-hidden border">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-full ${sub.color}`}>{sub.icon}</div>
                                <h3 className="text-2xl font-bold text-gray-800">{sub.name}</h3>
                            </div>
                            <p className="text-gray-600 mb-6">Master the fundamentals of {sub.name} with our curated video lessons and practice tests.</p>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <Link to={`/student/lessons/${sub.name.toLowerCase()}?standard=${user?.standard || ''}`} className="flex-1 bg-primary text-white text-center font-bold py-2 rounded-lg hover:bg-opacity-90 transition">
                                    View Lessons
                                </Link>
                                <Link to={`/student/test/${sub.name.toLowerCase()}?standard=${user?.standard || ''}`} className="flex-1 border border-primary text-primary text-center font-bold py-2 rounded-lg hover:bg-blue-50 transition">
                                    Take Tests
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Subjects
