import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, BookOpen, Trophy, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedAnimalAvatar from '../components/AnimatedAnimalAvatar';

const SUBJECTS = [
    { key: 'maths', label: 'Maths' },
    { key: 'english', label: 'English' },
    { key: 'marathi', label: 'Marathi' },
    { key: 'intelligence', label: 'Intelligence Test' },
];

const getSubjectStats = (progress, key) => {
    const subject = progress?.[key] || { lessonsCompleted: [], testsTaken: [] };
    const testsTaken = Array.isArray(subject.testsTaken) ? subject.testsTaken : [];

    const totalScore = testsTaken.reduce((acc, t) => acc + (t.score || 0), 0);
    const totalMarks = testsTaken.reduce((acc, t) => acc + (t.total || 0), 0);
    const accuracy = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

    return {
        testsCount: testsTaken.length,
        accuracy,
    };
};

const Profile = () => {
    const { user, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [emailConfirm, setEmailConfirm] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const subjectCards = useMemo(() => {
        if (!user) return [];
        return SUBJECTS.map((s) => ({
            ...s,
            ...getSubjectStats(user.progress, s.key),
        }));
    }, [user]);

    const overall = useMemo(() => {
        const totalTests = subjectCards.reduce((acc, s) => acc + s.testsCount, 0);
        const avgAccuracy = subjectCards.length
            ? Math.round(subjectCards.reduce((acc, s) => acc + s.accuracy, 0) / subjectCards.length)
            : 0;

        return {
            totalTests,
            avgAccuracy,
        };
    }, [subjectCards]);

    if (!user) return <div className="p-8">Loading profile...</div>;

    const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently';

    const handleDeleteAccount = async () => {
        setDeleteError('');
        if (confirmText.trim().toUpperCase() !== 'DELETE') {
            setDeleteError('Please type DELETE to continue.');
            return;
        }
        if (emailConfirm.trim().toLowerCase() !== String(user.email || '').trim().toLowerCase()) {
            setDeleteError('Please enter your exact email for verification.');
            return;
        }

        try {
            setDeleteLoading(true);
            await deleteAccount({ confirmText, emailConfirm });
            setDeleteModalOpen(false);
            navigate('/', { replace: true });
        } catch (error) {
            setDeleteError(error?.response?.data?.message || 'Could not delete account.');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-card shadow-lg p-8 flex flex-col md:flex-row items-center gap-8">
                <AnimatedAnimalAvatar user={user} size="lg" className="border-4 border-primary/20" />
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-800">{user.name}</h1>
                    <p className="text-gray-500 text-lg">{user.email}</p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold capitalize">{user.role}</span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Standard {user.standard || 'Not set'}</span>
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">Joined {joinedDate}</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-card shadow-md p-6">
                    <div className="flex items-center gap-2 text-gray-600 mb-2"><Trophy size={18} /> Tests Attempted</div>
                    <p className="text-3xl font-extrabold text-accent">{overall.totalTests}</p>
                </div>
                <div className="bg-white rounded-card shadow-md p-6">
                    <div className="flex items-center gap-2 text-gray-600 mb-2"><Target size={18} /> Average Accuracy</div>
                    <p className="text-3xl font-extrabold text-highlight">{overall.avgAccuracy}%</p>
                </div>
            </div>

            <div className="mt-8 bg-white rounded-card shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><BarChart3 size={20} /> Subject-wise Progress</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjectCards.map((subject) => (
                        <div key={subject.key} className="border rounded-xl p-4">
                            <h3 className="text-lg font-bold text-gray-800">{subject.label}</h3>
                            <div className="mt-2 text-sm text-gray-600">Tests attempted: <span className="font-semibold">{subject.testsCount}</span></div>
                            <div className="text-sm text-gray-600">Accuracy: <span className="font-semibold">{subject.accuracy}%</span></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 bg-white rounded-card shadow-md p-6">
                <h3 className="text-xl font-bold mb-2">Purchased Tests</h3>
                <p className="text-gray-600">Total purchased tests: <span className="font-semibold">{user.purchasedTests?.length || 0}</span></p>
            </div>

            <div className="mt-8 bg-white rounded-card shadow-md p-6 border border-red-100">
                <h3 className="text-xl font-bold text-red-700 mb-2">Danger Zone</h3>
                <p className="text-gray-600 text-sm mb-4">Delete your account permanently. This action cannot be undone.</p>
                <button
                    type="button"
                    onClick={() => {
                        setDeleteError('');
                        setConfirmText('');
                        setEmailConfirm('');
                        setDeleteModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                    Delete Account
                </button>
            </div>

            {deleteModalOpen && (
                <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 p-5">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">Confirm Account Deletion</h4>
                        <p className="text-sm text-gray-600 mb-4">This will permanently remove your account and cannot be reversed.</p>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Type DELETE</label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                            placeholder="DELETE"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter your email</label>
                        <input
                            type="email"
                            value={emailConfirm}
                            onChange={(e) => setEmailConfirm(e.target.value)}
                            className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                            placeholder={user.email}
                        />

                        {deleteError && <p className="text-sm text-red-600 mb-3">{deleteError}</p>}

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
