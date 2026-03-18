import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Video, FileText, Plus, BarChart, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ users: 0, videos: 0, tests: 0 });

    useEffect(() => {
        // Fetch stats if API available
    }, []);

    const Overview = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-500 text-white p-6 rounded-card shadow-lg flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold opacity-80">Total Students</h3>
                  <p className="text-4xl font-bold mt-2">1,234</p>
                </div>
                <User size={48} className="opacity-50" />
            </div>
             <div className="bg-green-500 text-white p-6 rounded-card shadow-lg flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold opacity-80">Videos Uploaded</h3>
                  <p className="text-4xl font-bold mt-2">456</p>
                </div>
                <Video size={48} className="opacity-50" />
            </div>
             <div className="bg-purple-500 text-white p-6 rounded-card shadow-lg flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold opacity-80">Tests Created</h3>
                  <p className="text-4xl font-bold mt-2">89</p>
                </div>
                 <FileText size={48} className="opacity-50" />
            </div>
        </div>
    );
    
    const ManageVideos = () => {
        const [formData, setFormData] = useState({ title: '', youtubeUrl: '', subject: 'maths', standard: 2 });
        const [loading, setLoading] = useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
                console.log('Submitting video:', formData);
                const response = await axios.post(`${API_URL}/api/videos`, formData, getAuthConfig());
                console.log('Video added response:', response.data);
                alert('Video Added Successfully!');
                setFormData({ title: '', youtubeUrl: '', subject: 'maths', standard: 2 });
            } catch (err) {
                console.error('Video upload error:', err);
                const message = err?.response?.data?.message || err?.message || 'Error adding video';
                alert(`Error adding video: ${message}`);
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="bg-white p-6 rounded-card shadow-md max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">Add New Video</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Subject</label>
                            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" required 
                                 value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                                <option value="maths">Maths</option>
                                <option value="english">English</option>
                                <option value="marathi">Marathi</option>
                                <option value="intelligence">Intelligence Test</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Standard</label>
                             <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" required 
                                 value={formData.standard} onChange={e => setFormData({...formData, standard: Number(e.target.value)})}>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="6">6</option>
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="10">10</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-2 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50">
                        {loading ? 'Adding...' : 'Add Video'}
                    </button>
                </form>
            </div>
        );
    }
    
    const ManageTests = () => { // Renamed UI to "Upload Test" but component name kept for now for less diff
        const [formData, setFormData] = useState({
            title: '',
            subject: 'maths',
            standard: 2,
            price: 0,
            isLocked: false
        });
        const [files, setFiles] = useState({ pdf: null, answerSheet: null });
        const [uploading, setUploading] = useState(false);
        const [tests, setTests] = useState([]);

        useEffect(() => {
            fetchTests();
        }, []);

        const fetchTests = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/tests`);
                setTests(data);
            } catch (error) {
                console.error('Error fetching tests:', error);
            }
        };

        const handleFileChange = (e) => {
            setFiles({ ...files, [e.target.name]: e.target.files[0] });
        };

        const handleCreateTest = async (e) => {
            e.preventDefault();
            if (!files.pdf) {
                alert('Please upload a Test PDF');
                return;
            }

            setUploading(true);
            const data = new FormData();
            data.append('title', formData.title);
            data.append('subject', formData.subject);
            data.append('standard', formData.standard);
            data.append('price', formData.price);
            data.append('isLocked', formData.isLocked);
            data.append('pdf', files.pdf);
            if (files.answerSheet) {
                data.append('answerSheet', files.answerSheet);
            }

            try {
                const config = getAuthConfig();
                await axios.post(`${API_URL}/api/tests`, data, {
                    headers: { 
                        ...config.headers, 
                        'Content-Type': 'multipart/form-data' 
                    }
                });
                alert('Test uploaded successfully');
                fetchTests(); // Refresh the list
                setFormData({
                    title: '',
                    subject: 'maths',
                    standard: 2,
                    price: 0,
                    isLocked: false
                });
                setFiles({ pdf: null, answerSheet: null });
                // Reset file inputs manually if needed
                document.getElementById('pdf-upload').value = '';
                const ansInput = document.getElementById('answer-upload');
                if (ansInput) ansInput.value = '';

            } catch (err) {
                console.error(err);
                const message = err?.response?.data?.message || err?.message || 'Failed to upload test';
                alert(`Failed to upload test: ${message}`);
            } finally {
                setUploading(false);
            }
        };

        return (
            <div className="bg-white p-6 rounded-card shadow-md max-w-3xl">
                <h2 className="text-2xl font-bold mb-4">Upload Test</h2>
                <form onSubmit={handleCreateTest} className="space-y-4">
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
                                <option value="2">2nd Std</option>
                                <option value="3">3rd Std</option>
                                <option value="4">4th Std</option>
                                <option value="5">5th Std</option>
                                <option value="6">6th Std</option>
                                <option value="7">7th Std</option>
                                <option value="8">8th Std</option>
                                <option value="9">9th Std</option>
                                <option value="10">10th Std</option>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (0 for free)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value), isLocked: Number(e.target.value) > 0 })}
                                className="w-full border rounded-lg p-2"
                                placeholder="Price"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Test Question Paper (PDF)</label>
                        <input 
                            id="pdf-upload"
                            type="file" 
                            name="pdf" 
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-indigo-600"
                            required
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

                    <button 
                        disabled={uploading}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : <><Plus size={20}/> Upload Test</>}
                    </button>
                </form>

                <div className="mt-8 border-t pt-6">
                    <h3 className="text-xl font-bold mb-4">Recent Uploads</h3>
                    {tests.length === 0 ? (
                        <p className="text-gray-500">No tests uploaded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {tests.map(test => (
                                <div key={test._id} className="flex justify-between items-center border p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                                    <div>
                                        <h4 className="font-bold text-gray-800">{test.title}</h4>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                                            {test.subject} • Std {test.standard} • {test.price > 0 ? `₹${test.price}` : 'Free'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {test.pdfUrl ? (
                                            <a href={test.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                                                PDF
                                            </a>
                                        ) : <span className="text-xs text-gray-400">No PDF</span>}
                                        
                                        {test.answerSheetUrl && (
                                            <a href={test.answerSheetUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                                                Key
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
                alert('Admin access list saved');
            } catch (error) {
                console.error(error);
                const message = error?.response?.data?.message || error?.message || 'Failed to save admin access list';
                alert(`Failed to save admin access list: ${message}`);
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
                <button onClick={() => setActiveTab('tests')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'tests' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <FileText size={20}/> Upload Tests
                </button>
                <button onClick={() => setActiveTab('admin-access')} className={`w-full text-left p-3 rounded flex items-center gap-3 ${activeTab === 'admin-access' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <ShieldCheck size={20}/> Admin Access
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold mb-8 capitalize">{activeTab.replace('-', ' ')}</h1>
                {activeTab === 'overview' && <Overview />}
                {activeTab === 'videos' && <ManageVideos />}
                {activeTab === 'tests' && <ManageTests />}
                {activeTab === 'admin-access' && <ManageAdminAccess />}
            </div>
        </div>
    );
};

export default AdminDashboard;
