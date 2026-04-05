import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Video, FileText, Plus, BarChart, ShieldCheck, Trash2, Edit2, Book, Bell, Mail, Wallet } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [feedback, setFeedback] = useState(null);
    const feedbackTimeoutRef = useRef(null);
    const [overviewStats, setOverviewStats] = useState({
        students: 0,
        videos: 0,
        tests: 0,
        paidTests: 0,
        freeTests: 0,
        completedPurchases: 0,
        revenue: 0,
    });
    const [overviewLoading, setOverviewLoading] = useState(false);

    const fetchOverviewStats = async () => {
        try {
            setOverviewLoading(true);
            const response = await axios.get(`${API_URL}/api/settings/overview-stats`, getAuthConfig());
            setOverviewStats({
                students: Number(response.data?.students || 0),
                videos: Number(response.data?.videos || 0),
                tests: Number(response.data?.tests || 0),
                paidTests: Number(response.data?.paidTests || 0),
                freeTests: Number(response.data?.freeTests || 0),
                completedPurchases: Number(response.data?.completedPurchases || 0),
                revenue: Number(response.data?.revenue || 0),
            });
        } catch (err) {
            console.error('Error loading overview stats:', err);
            notify('error', 'Could not load overview stats.');
        } finally {
            setOverviewLoading(false);
        }
    };

    const notify = (type, text) => {
        setFeedback({ type, text });
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 2500);
    };

    useEffect(() => {
        fetchOverviewStats();
        return () => {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchOverviewStats();
        }
    }, [activeTab]);

    const Overview = () => (
        <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Performance Dashboard</h2>
                <button
                    type="button"
                    onClick={fetchOverviewStats}
                    disabled={overviewLoading}
                    className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                    {overviewLoading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-500 text-white p-6 rounded-card shadow-lg flex items-center justify-between">
                    <div>
                    <h3 className="text-lg font-semibold opacity-80">Total Students</h3>
                    <p className="text-4xl font-bold mt-2">{overviewStats.students.toLocaleString()}</p>
                    </div>
                    <User size={48} className="opacity-50" />
                </div>
                <div className="bg-green-500 text-white p-6 rounded-card shadow-lg flex items-center justify-between">
                    <div>
                    <h3 className="text-lg font-semibold opacity-80">Videos Uploaded</h3>
                    <p className="text-4xl font-bold mt-2">{overviewStats.videos.toLocaleString()}</p>
                    </div>
                    <Video size={48} className="opacity-50" />
                </div>
                <div className="bg-purple-500 text-white p-6 rounded-card shadow-lg flex items-center justify-between">
                    <div>
                    <h3 className="text-lg font-semibold opacity-80">Tests Created</h3>
                    <p className="text-4xl font-bold mt-2">{overviewStats.tests.toLocaleString()}</p>
                    </div>
                    <FileText size={48} className="opacity-50" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-amber-500 text-white p-6 rounded-card shadow-lg">
                    <h3 className="text-lg font-semibold opacity-80">Paid Tests</h3>
                    <p className="text-4xl font-bold mt-2">{overviewStats.paidTests.toLocaleString()}</p>
                </div>
                <div className="bg-teal-500 text-white p-6 rounded-card shadow-lg">
                    <h3 className="text-lg font-semibold opacity-80">Completed Purchases</h3>
                    <p className="text-4xl font-bold mt-2">{overviewStats.completedPurchases.toLocaleString()}</p>
                </div>
                <div className="bg-rose-500 text-white p-6 rounded-card shadow-lg">
                    <h3 className="text-lg font-semibold opacity-80">Revenue</h3>
                    <p className="text-4xl font-bold mt-2">Rs {overviewStats.revenue.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
    
    const ManageVideos = () => {
        const [formData, setFormData] = useState({ title: '', youtubeUrl: '', subject: 'maths', standard: 2 });
        const [loading, setLoading] = useState(false);
        const [videos, setVideos] = useState([]);
        const [editingId, setEditingId] = useState(null);

        useEffect(() => {
            fetchVideos();
        }, [formData.subject, formData.standard]);

        const fetchVideos = async () => {
             try {
                const response = await axios.get(`${API_URL}/api/videos?subject=${formData.subject}&standard=${formData.standard}`, getAuthConfig());
                setVideos(response.data);
            } catch (err) {
                console.error('Error fetching videos:', err);
            }
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
                const config = getAuthConfig();
                if (editingId) {
                    await axios.put(`${API_URL}/api/videos/${editingId}`, formData, config);
                    notify('success', 'Video updated.');
                    setEditingId(null);
                } else {
                    await axios.post(`${API_URL}/api/videos`, formData, config);
                    notify('success', 'Video added.');
                }
                setFormData({ ...formData, title: '', youtubeUrl: '' }); // Keep subject/standard
                fetchVideos();
            } catch (err) {
                console.error('Video save error:', err);
                notify('error', 'Could not save video.');
            } finally {
                setLoading(false);
            }
        };

        const handleEdit = (video) => {
            setFormData({
                title: video.title,
                youtubeUrl: video.youtubeUrl,
                subject: video.subject,
                standard: video.standard
            });
            setEditingId(video._id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const handleDelete = async (id) => {
            try {
                await axios.delete(`${API_URL}/api/videos/${id}`, getAuthConfig());
                fetchVideos();
                notify('success', 'Video deleted.');
            } catch (err) {
                console.error('Delete error:', err);
                notify('error', 'Could not delete video.');
            }
        };

        const getThumbnailUrl = (url) => {
            if (!url) return '';
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg` : '';
        };

        return (
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-card shadow-md max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Video' : 'Add New Video'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subject</label>
                                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-gray-50" required 
                                    value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                                    <option value="maths">Maths</option>
                                    <option value="english">English</option>
                                    <option value="marathi">Marathi</option>
                                    <option value="intelligence">Intelligence Test</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Standard</label>
                                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-gray-50" required 
                                    value={formData.standard} onChange={e => setFormData({...formData, standard: Number(e.target.value)})}>
                                    {[...Array(9)].map((_, i) => <option key={i+2} value={i+2}>{i+2}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" required 
                                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">YouTube URL</label>
                            <input type="url" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" required 
                                value={formData.youtubeUrl} onChange={e => setFormData({...formData, youtubeUrl: e.target.value})} />
                        </div>
                        
                        <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white font-bold py-2 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50">
                                {loading ? 'Saving...' : (editingId ? 'Update Video' : 'Add Video')}
                            </button>
                            {editingId && (
                                <button type="button" onClick={() => { setEditingId(null); setFormData({ ...formData, title: '', youtubeUrl: '' }); }} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded hover:bg-gray-300 transition">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-card shadow-md max-w-4xl mx-auto">
                    <h3 className="text-sm font-bold mb-4 uppercase text-gray-500 tracking-wide">{formData.subject} - Standard {formData.standard} Videos</h3>
                    <div className="space-y-4">
                        {videos.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No videos found for this selection.</p>
                        ) : (
                            videos.map(video => (
                                <div key={video._id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:shadow-md transition bg-gray-50 items-start sm:items-center group">
                                    <div className="relative w-full sm:w-40 h-24 flex-shrink-0 rounded-md overflow-hidden bg-black">
                                        <img src={getThumbnailUrl(video.youtubeUrl)} alt={video.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Video className="text-white opacity-80" size={24} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg text-gray-900 truncate">{video.title}</h4>
                                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full capitalize">{video.subject}</span>
                                            <span className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">Std {video.standard}</span>
                                            {video.duration && <span>• {video.duration}</span>}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 self-end sm:self-center bg-white p-1 rounded-lg border shadow-sm">
                                        <button onClick={() => handleEdit(video)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md" title="Edit">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(video._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    // ManageClasses component starts here

    const ManageClasses = () => {
        const [classes, setClasses] = useState([]);
        const [formData, setFormData] = useState({ label: '', value: '' });

        useEffect(() => { fetchClasses(); }, []);

        const fetchClasses = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/standards`);
                setClasses(res.data);
            } catch (err) { console.error(err); }
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            try {
                await axios.post(`${API_URL}/api/standards`, { ...formData, value: Number(formData.value) }, getAuthConfig());
                setFormData({ label: '', value: '' });
                fetchClasses();
                notify('success', 'Class added.');
            } catch (err) { console.error(err); notify('error', 'Could not add class.'); }
        };

        const handleDelete = async (id) => {
            try {
                await axios.delete(`${API_URL}/api/standards/${id}`, getAuthConfig());
                fetchClasses();
                notify('success', 'Class deleted.');
            } catch (err) {
                console.error(err);
                notify('error', 'Could not delete class.');
            }
        };

        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus size={20}/> Add New Class</h3>
                    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name (Label)</label>
                            <input type="text" placeholder="e.g. Standard 5" className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} required />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class Number (Value)</label>
                            <input type="number" placeholder="e.g. 5" className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} required />
                        </div>
                        <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded font-bold hover:bg-blue-700 transition flex items-center gap-2 justify-center w-full md:w-auto shadow-md hover:shadow-lg">
                            Add Class
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Existing Classes</div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-gray-600 font-semibold">Class Name</th>
                                <th className="p-4 text-gray-600 font-semibold">Value</th>
                                <th className="p-4 text-right text-gray-600 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.length > 0 ? classes.map(c => (
                                <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-800">{c.label}</td>
                                    <td className="p-4 text-gray-600">{c.value}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition" title="Delete Class"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-500 italic">No classes found. Add one above to get started.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const ManageTests = () => {
        const [formData, setFormData] = useState({
            title: '',
            subject: 'maths',
            standard: 2,
            price: 0,
            isLocked: false,
            accessType: 'free'
        });
        const [files, setFiles] = useState({ pdf: null, answerSheet: null });
        const [uploading, setUploading] = useState(false);
        const [tests, setTests] = useState([]);
        const [editingId, setEditingId] = useState(null);
        const [paidBoxes, setPaidBoxes] = useState([]);
        const [boxForm, setBoxForm] = useState({ standard: 2, title: '', description: '', amount: '' });
        const [boxSaving, setBoxSaving] = useState(false);

        useEffect(() => {
            fetchTests();
            fetchPaidBoxes();
        }, []);

        const fetchTests = async () => {
             try {
                const { data } = await axios.get(`${API_URL}/api/tests`);
                setTests(data);
            } catch (error) {
                console.error('Error fetching tests:', error);
            }
        };

        const fetchPaidBoxes = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/tests/paid-standard-boxes`, getAuthConfig());
                setPaidBoxes(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching paid standard boxes:', error);
            }
        };

        const handleFileChange = (e) => {
            setFiles({ ...files, [e.target.name]: e.target.files[0] });
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            
            if (!editingId && !files.pdf) {
                notify('error', 'Please upload a test PDF.');
                return;
            }

            setUploading(true);

            try {
                const config = getAuthConfig();
                
                if (editingId) {
                    await axios.put(`${API_URL}/api/tests/${editingId}`, {
                        ...formData,
                        standard: Number(formData.standard),
                        isLocked: formData.accessType === 'paid',
                        price: formData.accessType === 'paid' ? Number(formData.price || 0) : 0
                    }, config);
                    notify('success', 'Test updated.');
                } else {
                    const data = new FormData();
                    data.append('title', formData.title);
                    data.append('subject', formData.subject);
                    data.append('standard', Number(formData.standard));
                    data.append('price', formData.accessType === 'paid' ? Number(formData.price || 0) : 0);
                    data.append('isLocked', formData.accessType === 'paid');
                    data.append('pdf', files.pdf);
                    if (files.answerSheet) {
                        data.append('answerSheet', files.answerSheet);
                    }

                    await axios.post(`${API_URL}/api/tests`, data, {
                        headers: { 
                            ...config.headers, 
                            'Content-Type': 'multipart/form-data' 
                        }
                    });
                    notify('success', 'Test uploaded.');
                }

                fetchTests();
                resetForm();

            } catch (err) {
                console.error(err);
                const message = err?.response?.data?.message || err?.message || 'Failed to save test';
                notify('error', `Failed: ${message}`);
            } finally {
                setUploading(false);
            }
        };

        const resetForm = () => {
            setFormData({
                title: '',
                subject: 'maths',
                standard: 2,
                price: 0,
                isLocked: false,
                accessType: 'free'
            });
            setFiles({ pdf: null, answerSheet: null });
            setEditingId(null);
            const pdfInput = document.getElementById('pdf-upload');
            if(pdfInput) pdfInput.value = '';
            const ansInput = document.getElementById('answer-upload');
            if(ansInput) ansInput.value = '';
        };

        const handleEdit = (test) => {
            setFormData({
                title: test.title,
                subject: test.subject,
                standard: Number(test.standard || 2),
                price: test.price,
                isLocked: test.isLocked,
                accessType: test.isLocked ? 'paid' : 'free'
            });
            setEditingId(test._id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const handleSavePaidBox = async (e) => {
            e.preventDefault();
            const amount = Number(boxForm.amount);

            if (!Number.isFinite(amount) || amount <= 0) {
                notify('error', 'Please enter a valid amount greater than 0 for paid box.');
                return;
            }

            try {
                setBoxSaving(true);
                await axios.post(`${API_URL}/api/tests/paid-standard-boxes`, {
                    standard: Number(boxForm.standard),
                    title: boxForm.title?.trim(),
                    description: boxForm.description?.trim(),
                    amount,
                    isActive: true,
                }, getAuthConfig());

                notify('success', `Paid box saved for Standard ${boxForm.standard}.`);
                setBoxForm({ standard: 2, title: '', description: '', amount: '' });
                fetchPaidBoxes();
            } catch (err) {
                console.error(err);
                notify('error', err?.response?.data?.message || 'Could not save paid box.');
            } finally {
                setBoxSaving(false);
            }
        };

        const handleDeletePaidBox = async (id) => {
            try {
                await axios.delete(`${API_URL}/api/tests/paid-standard-boxes/${id}`, getAuthConfig());
                notify('success', 'Paid box deleted.');
                fetchPaidBoxes();
            } catch (err) {
                console.error(err);
                notify('error', err?.response?.data?.message || 'Could not delete paid box.');
            }
        };

        const handleDelete = async (id) => {
            try {
                await axios.delete(`${API_URL}/api/tests/${id}`, getAuthConfig());
                fetchTests(); 
                notify('success', 'Test deleted.');
            } catch (err) {
                console.error('Delete error:', err);
                notify('error', 'Could not delete test.');
            }
        };

        return (
            <div className="bg-white p-6 rounded-card shadow-md max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">{editingId ? 'Edit Test' : 'Upload Test'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Maths Unit Test 1"
                            className="w-full border rounded-lg p-2"
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Standard</label>
                            <select
                                value={formData.standard}
                                onChange={(e) => setFormData({ ...formData, standard: Number(e.target.value) })}
                                className="w-full border rounded-lg p-2"
                            >
                                {[...Array(9)].map((_, i) => <option key={i+2} value={i+2}>Standard {i+2}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <select
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full border rounded-lg p-2"
                            >
                                <option value="maths">Maths</option>
                                <option value="english">English</option>
                                <option value="marathi">Marathi</option>
                                <option value="intelligence">Intelligence Test</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                            <select
                                value={formData.accessType}
                                onChange={(e) => {
                                    const accessType = e.target.value;
                                    setFormData({
                                        ...formData,
                                        accessType,
                                        price: accessType === 'free' ? 0 : (formData.price > 0 ? formData.price : 1),
                                        isLocked: accessType === 'paid'
                                    });
                                }}
                                className="w-full border rounded-lg p-2"
                            >
                                <option value="free">Free Test</option>
                                <option value="paid">Paid Test</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value), isLocked: Number(e.target.value) > 0 })}
                                disabled={formData.accessType === 'free'}
                                className="w-full border rounded-lg p-2"
                                placeholder={formData.accessType === 'free' ? 'Free Test (Price locked to 0)' : 'Price'}
                            />
                        </div>
                    </div>

                    {!editingId && (
                        <>
                            <div className="border-t pt-4 mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Test Question Paper (PDF)</label>
                                <input 
                                    id="pdf-upload"
                                    type="file" 
                                    name="pdf" 
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-indigo-600"
                                    required={!editingId}
                                />
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Sheet / Key (PDF) - Optional</label>
                                <input 
                                    id="answer-upload"
                                    type="file" 
                                    name="answerSheet" 
                                    accept="application/pdf" 
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-2">
                        <button 
                            disabled={uploading}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            {uploading ? 'Saving...' : <><Plus size={20}/> {editingId ? 'Update Test' : 'Upload Test'}</>}
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>

                <div className="mt-8 border-t pt-6">
                    <h3 className="text-xl font-bold mb-4">Manage Tests</h3>
                    {tests.length === 0 ? (
                        <p className="text-gray-500">No tests uploaded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {tests.map(test => (
                                <div key={test._id} className="flex justify-between items-center border p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-full shadow-sm">
                                            <FileText className="text-indigo-600" size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{test.title}</h4>
                                            <div className="flex gap-2 text-xs mt-1">
                                                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Std {test.standard}</span>
                                                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded capitalize">{test.subject}</span>
                                                <span className={`px-2 py-0.5 rounded ${test.isLocked ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {test.isLocked ? 'Paid (Box)' : 'Free'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {test.pdfUrl && (
                                            <a href={test.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline">
                                                View PDF
                                            </a>
                                        )}
                                        <div className="w-px h-6 bg-gray-300"></div>
                                        <button onClick={() => handleEdit(test)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition" title="Edit">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(test._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8 border-t pt-6">
                    <h3 className="text-xl font-bold mb-4">Paid Standard Boxes</h3>
                    <form onSubmit={handleSavePaidBox} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <select
                            value={boxForm.standard}
                            onChange={(e) => setBoxForm({ ...boxForm, standard: Number(e.target.value) })}
                            className="border rounded-lg p-2"
                        >
                            {[...Array(9)].map((_, i) => <option key={i+2} value={i+2}>Standard {i+2}</option>)}
                        </select>
                        <input
                            type="text"
                            value={boxForm.title}
                            onChange={(e) => setBoxForm({ ...boxForm, title: e.target.value })}
                            className="border rounded-lg p-2"
                            placeholder="Box title (optional)"
                        />
                        <input
                            type="number"
                            min="1"
                            value={boxForm.amount}
                            onChange={(e) => setBoxForm({ ...boxForm, amount: e.target.value })}
                            className="border rounded-lg p-2"
                            placeholder="Amount"
                            required
                        />
                        <button
                            type="submit"
                            disabled={boxSaving}
                            className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                        >
                            {boxSaving ? 'Saving...' : 'Save Box'}
                        </button>
                    </form>

                    <textarea
                        value={boxForm.description}
                        onChange={(e) => setBoxForm({ ...boxForm, description: e.target.value })}
                        className="w-full border rounded-lg p-2 mb-4"
                        rows={2}
                        placeholder="Description (optional)"
                    />

                    {paidBoxes.length === 0 ? (
                        <p className="text-gray-500">No paid standard boxes created yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {paidBoxes.map((box) => (
                                <div key={box._id} className="border p-4 rounded-lg bg-yellow-50 space-y-3">
                                    <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900">Standard {box.standard} - {box.title || `Premium Box`}</h4>
                                        <p className="text-sm text-gray-600">{box.description || 'No description provided.'}</p>
                                        <p className="text-xs text-yellow-700 font-semibold mt-1">Price: ₹{box.amount} | Paid Tests In This Standard: {box.testsCount || 0}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDeletePaidBox(box._id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition"
                                        title="Delete paid box"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    </div>
                                    </div>
                                    <p className="text-sm text-gray-700 bg-white border rounded-lg p-3">
                                        All paid tests uploaded for Standard {box.standard} are automatically included in this box.
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const ManageSubjects = () => {
        const subjects = [
            { key: 'maths', label: 'Maths' },
            { key: 'english', label: 'English' },
            { key: 'marathi', label: 'Marathi' },
            { key: 'intelligence', label: 'Intelligence Test' },
        ];

        return (
            <div className="bg-white p-6 rounded-card shadow-md max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Subjects</h2>
                <p className="text-gray-600 mb-6">These subjects are currently available across lessons and tests.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjects.map((subject) => (
                        <div key={subject.key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <h3 className="font-semibold text-gray-800">{subject.label}</h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Key: {subject.key}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const ManageNews = () => {
        const [news, setNews] = useState([]);
        const [formData, setFormData] = useState({ title: '', description: '', link: '' });
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            fetchNews();
        }, []);

        const fetchNews = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/announcements`);
                setNews(data);
            } catch (err) {
                console.error(err);
            }
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
                await axios.post(`${API_URL}/api/announcements`, formData, getAuthConfig());
                setFormData({ title: '', description: '', link: '' });
                fetchNews();
                notify('success', 'Announcement posted.');
            } catch (err) {
                console.error(err);
                notify('error', 'Could not post announcement.');
            } finally {
                setLoading(false);
            }
        };

        const handleDelete = async (id) => {
            try {
                await axios.delete(`${API_URL}/api/announcements/${id}`, getAuthConfig());
                fetchNews();
                notify('success', 'Announcement deleted.');
            } catch (err) {
                console.error(err);
                notify('error', 'Could not delete announcement.');
            }
        };

        return (
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Bell size={20}/> Post New Announcement</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" 
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                                required 
                                placeholder="Important Update"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">External Link (Optional)</label>
                            <input 
                                type="url" 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" 
                                value={formData.link} 
                                onChange={e => setFormData({...formData, link: e.target.value})} 
                                placeholder="https://example.com/news-article"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none transition h-24"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                required
                                placeholder="Details about the announcement..."
                            ></textarea>
                        </div>
                        <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2.5 rounded font-bold hover:bg-blue-700 transition flex items-center gap-2 justify-center shadow-md disabled:opacity-50">
                            {loading ? 'Posting...' : 'Post Announcement'}
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Recent Announcements</div>
                    <div className="divide-y divide-gray-100">
                        {news.length > 0 ? news.map(item => (
                            <div key={item._id} className="p-4 hover:bg-gray-50 transition flex justify-between items-start gap-4">
                                <div>
                                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                        {item.title}
                                        {item.link && (
                                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200 transition">
                                                Link Attached ↗
                                            </a>
                                        )}
                                    </h4>
                                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                                    <p className="text-xs text-gray-400 mt-2">{new Date(item.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition shrink-0" title="Delete">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-500 italic">No announcements posted yet.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ManageAdminAccess = () => {
        const [emails, setEmails] = useState([]);
        const [newEmail, setNewEmail] = useState('');
        const [saving, setSaving] = useState(false);

        useEffect(() => {
            const loadEmails = async () => {
                try {
                    const { data } = await axios.get(`${API_URL}/api/settings/admin-emails`, getAuthConfig());
                    setEmails(data.emails || []);
                } catch (error) {
                    console.error(error);
                }
            };
            loadEmails();
        }, []);

        const addEmail = () => {
            const normalized = newEmail.trim().toLowerCase();
            if (!normalized || emails.includes(normalized)) return;
            setEmails([...emails, normalized]);
            setNewEmail('');
        };

        const removeEmail = (email) => {
            setEmails(emails.filter((e) => e !== email));
        };

        const saveEmails = async () => {
            try {
                setSaving(true);
                const { data } = await axios.put(`${API_URL}/api/settings/admin-emails`, { emails }, getAuthConfig());
                setEmails(data.emails || []);
                notify('success', 'Admin access list saved.');
            } catch (error) {
                console.error(error);
                const message = error?.response?.data?.message || error?.message || 'Failed to save admin access list';
                notify('error', `Could not save admin access list: ${message}`);
            } finally {
                setSaving(false);
            }
        };

        return (
            <div className="bg-white p-6 rounded-card shadow-md max-w-3xl">
                <h2 className="text-2xl font-bold mb-4">Admin Access Emails</h2>
                <p className="text-gray-600 mb-4">Only these Google accounts can access admin panel after sign-in.</p>

                <div className="flex gap-2 mb-4">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="flex-1 border rounded-lg p-2"
                    />
                    <button onClick={addEmail} className="bg-primary text-white px-4 py-2 rounded-lg">Add</button>
                </div>

                <div className="space-y-2 mb-4">
                    {emails.map((email) => (
                        <div key={email} className="flex justify-between items-center border rounded-lg p-2">
                            <span>{email}</span>
                            <button onClick={() => removeEmail(email)} className="text-red-600 font-semibold">Remove</button>
                        </div>
                    ))}
                    {emails.length === 0 && <p className="text-sm text-gray-500">No admin emails configured yet.</p>}
                </div>

                <button onClick={saveEmails} disabled={saving} className="bg-accent text-white px-4 py-2 rounded-lg disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Admin Email List'}
                </button>
            </div>
        );
    };

    const BroadcastEmail = () => {
        const [formData, setFormData] = useState({
            subject: '',
            message: '',
            ctaText: '',
            ctaLink: ''
        });
        const [sending, setSending] = useState(false);
        const [result, setResult] = useState(null);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setSending(true);
            setResult(null);

            try {
                const { data } = await axios.post(`${API_URL}/api/settings/broadcast-email`, formData, getAuthConfig());
                setResult({ type: 'success', data });
                setFormData((prev) => ({ ...prev, subject: '', message: '' }));
            } catch (error) {
                const message = error?.response?.data?.message || error?.message || 'Failed to send broadcast email';
                setResult({ type: 'error', message });
            } finally {
                setSending(false);
            }
        };

        return (
            <div className="bg-white p-6 rounded-card shadow-md max-w-3xl">
                <h2 className="text-2xl font-bold mb-2">Broadcast Email</h2>
                <p className="text-gray-600 mb-6">Send offers, updates, or announcements to all users who have logged in.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                        <input
                            type="text"
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full border rounded-lg p-2"
                            placeholder="New offer for this week"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            required
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className="w-full border rounded-lg p-2 h-32"
                            placeholder="Write the email body here..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text (Optional)</label>
                            <input
                                type="text"
                                value={formData.ctaText}
                                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                                className="w-full border rounded-lg p-2"
                                placeholder="Explore Now"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link (Optional)</label>
                            <input
                                type="url"
                                value={formData.ctaLink}
                                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                                className="w-full border rounded-lg p-2"
                                placeholder="https://example.com/offer"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-60"
                    >
                        {sending ? 'Sending...' : 'Send To All Users'}
                    </button>
                </form>

                {result?.type === 'success' && (
                    <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                        Sent {result.data.sent} of {result.data.totalRecipients} emails.
                        {result.data.failedCount > 0 ? ` Failed: ${result.data.failedCount}.` : ''}
                    </div>
                )}

                {result?.type === 'error' && (
                    <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                        {result.message}
                    </div>
                )}
            </div>
        );
    };

    const ManageStudentPurchases = () => {
        const [users, setUsers] = useState([]);
        const [tests, setTests] = useState([]);
        const [selectedUserId, setSelectedUserId] = useState('');
        const [selectedPurchases, setSelectedPurchases] = useState([]);
        const [saving, setSaving] = useState(false);

        useEffect(() => {
            const loadData = async () => {
                try {
                    const { data } = await axios.get(`${API_URL}/api/settings/student-purchases`, getAuthConfig());
                    setUsers(data.users || []);
                    setTests((data.tests || []).filter((t) => Boolean(t.isLocked) || Number(t.price) > 0));

                    if (data.users?.length) {
                        setSelectedUserId(data.users[0].id);
                        setSelectedPurchases(data.users[0].purchasedTests || []);
                    }
                } catch (error) {
                    console.error(error);
                    notify('error', 'Could not load student purchase data.');
                }
            };

            loadData();
        }, []);

        const handleSelectUser = (userId) => {
            setSelectedUserId(userId);
            const user = users.find((u) => u.id === userId);
            setSelectedPurchases(user?.purchasedTests || []);
        };

        const togglePurchase = (testId) => {
            setSelectedPurchases((prev) => (
                prev.includes(testId)
                    ? prev.filter((id) => id !== testId)
                    : [...prev, testId]
            ));
        };

        const savePurchases = async () => {
            if (!selectedUserId) return;

            try {
                setSaving(true);
                const { data } = await axios.put(
                    `${API_URL}/api/settings/student-purchases/${selectedUserId}`,
                    { purchasedTests: selectedPurchases },
                    getAuthConfig()
                );

                setUsers((prev) => prev.map((u) => (
                    u.id === selectedUserId
                        ? { ...u, purchasedTests: data.purchasedTests || [] }
                        : u
                )));

                notify('success', 'Student purchases updated.');
            } catch (error) {
                console.error(error);
                notify('error', error?.response?.data?.message || 'Could not save purchases.');
            } finally {
                setSaving(false);
            }
        };

        const selectedUser = users.find((u) => u.id === selectedUserId);

        return (
            <div className="bg-white p-6 rounded-card shadow-md max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Student Test Purchases</h2>
                <p className="text-gray-600 mb-6">Manually add/remove paid tests for students in case of missed payment callbacks.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => handleSelectUser(e.target.value)}
                            className="w-full border rounded-lg p-2"
                        >
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                        <p className="text-gray-500">Selected</p>
                        <p className="font-semibold text-gray-800 truncate">{selectedUser?.name || '-'}</p>
                        <p className="text-gray-600 truncate">{selectedUser?.email || '-'}</p>
                    </div>
                </div>

                <div className="border rounded-lg max-h-[420px] overflow-auto">
                    {tests.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No paid tests found yet.</div>
                    ) : (
                        <div className="divide-y">
                            {tests.map((test) => {
                                const checked = selectedPurchases.includes(test.id);
                                return (
                                    <label key={test.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePurchase(test.id)}
                                            className="h-4 w-4"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 truncate">{test.title}</p>
                                            <p className="text-xs text-gray-500 capitalize">{test.subject}</p>
                                        </div>
                                        <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-1 rounded">₹{test.price}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        onClick={savePurchases}
                        disabled={saving || !selectedUserId}
                        className="bg-primary text-white px-5 py-2 rounded-lg disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Save Purchase Access'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-100">
             {/* Admin Sidebar */}
            <div className="w-64 bg-white shadow-lg p-4 space-y-2 hidden md:block">
                <button onClick={() => setActiveTab('overview')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <BarChart size={20}/> Overview
                </button>
                <button onClick={() => setActiveTab('videos')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'videos' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Video size={20}/> Manage Videos
                </button>
                <button onClick={() => setActiveTab('classes')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'classes' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Book size={20}/> Manage Classes
                </button>
                <button onClick={() => setActiveTab('subjects')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'subjects' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Book size={20}/> Manage Subjects
                </button>
                <button onClick={() => setActiveTab('tests')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'tests' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <FileText size={20}/> Upload Tests
                </button>
                <button onClick={() => setActiveTab('news')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'news' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Bell size={20}/> Manage News
                </button>
                <button onClick={() => setActiveTab('admin-access')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'admin-access' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <ShieldCheck size={20}/> Admin Access
                </button>
                <button onClick={() => setActiveTab('broadcast')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'broadcast' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Mail size={20}/> Broadcast Email
                </button>
                <button onClick={() => setActiveTab('student-purchases')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'student-purchases' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Wallet size={20}/> Student Purchases
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold mb-8 capitalize">{activeTab.replace('-', ' ')}</h1>
                {feedback && (
                    <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {feedback.text}
                    </div>
                )}
                {activeTab === 'overview' && <Overview />}
                {activeTab === 'videos' && <ManageVideos />}
                {activeTab === 'classes' && <ManageClasses />}
                {activeTab === 'subjects' && <ManageSubjects />}
                {activeTab === 'tests' && <ManageTests />}
                {activeTab === 'news' && <ManageNews />}
                {activeTab === 'admin-access' && <ManageAdminAccess />}
                {activeTab === 'broadcast' && <BroadcastEmail />}
                {activeTab === 'student-purchases' && <ManageStudentPurchases />}
            </div>
        </div>
    );
};

export default AdminDashboard;
