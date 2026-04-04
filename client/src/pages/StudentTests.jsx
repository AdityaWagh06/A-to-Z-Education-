import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, ArrowRight } from 'lucide-react';

const StudentTests = () => {
    const { user } = useAuth();

    const subjects = [
        { name: 'Maths', color: 'bg-blue-100 text-blue-700' },
        { name: 'English', color: 'bg-red-100 text-red-700' },
        { name: 'Marathi', color: 'bg-green-100 text-green-700' },
        { name: 'Intelligence', color: 'bg-yellow-100 text-yellow-700' },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Practice Tests</h1>
                <p className="text-gray-500 mt-2">
                    Standard: <span className="font-semibold">{user?.standard || 'Not selected'}</span>. Choose a subject to start tests.
                </p>
            </header>

            {!user?.standard && (
                <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 text-sm">
                    Please select your class in Home first to get the correct tests.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subjects.map((sub) => (
                    <Link
                        to={`/student/test/${sub.name.toLowerCase()}?standard=${user?.standard || ''}`}
                        key={sub.name}
                        className="bg-white rounded-card shadow-lg overflow-hidden border hover:shadow-xl transition"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-3">
                                <div className={`p-3 rounded-full ${sub.color}`}>
                                    <FileText className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">{sub.name}</h3>
                            </div>
                            <p className="text-gray-600 mb-5">Attempt chapter-wise and full-length tests for {sub.name}.</p>
                            <div className="inline-flex items-center gap-2 text-primary font-semibold">
                                Open Tests <ArrowRight size={16} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default StudentTests;
