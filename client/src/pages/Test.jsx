import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, FileText, CheckCircle, X, Eye } from 'lucide-react';

const Test = () => {
    const { subject } = useParams();
    const [searchParams] = useSearchParams();
    const standard = searchParams.get('standard');
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPdf, setCurrentPdf] = useState(null);
    const [pdfTitle, setPdfTitle] = useState('');

    useEffect(() => {
        fetchTests();
    }, [subject, standard]);

    const fetchTests = async () => {
        try {
            const standardQuery = standard ? `&standard=${standard}` : '';
            const res = await axios.get(`http://localhost:5000/api/tests?subject=${subject}${standardQuery}`);
            setTests(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleViewPdf = (url, title) => {
        setPdfTitle(title);
        setCurrentPdf(url);
    };

    const handleUnlock = (test) => {
        alert("Payment integration placeholder. In a real app, this would open Razorpay.");
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 capitalize">{subject} Tests</h1>

            {loading ? (
                <p>Loading tests...</p>
            ) : tests.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-xl text-gray-500">No tests available for this subject yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map((test) => (
                        <div key={test._id} className="bg-white rounded-card shadow-md overflow-hidden hover:shadow-lg transition">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
                                <h3 className="text-xl font-bold">{test.title}</h3>
                                <div className="flex justify-between items-center mt-2 text-sm opacity-90">
                                    <span>{test.questions?.length > 0 ? `${test.questions.length} Questions` : 'PDF Test'}</span>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <span className={`text-sm font-bold px-2 py-1 rounded ${test.price > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {test.price > 0 ? `₹${test.price}` : 'Free'}
                                    </span>
                                    {test.isLocked && <Lock className="text-gray-400" size={18} />}
                                </div>

                                <div className="space-y-3">
                                    {test.pdfUrl ? (
                                        <button 
                                            onClick={() => handleViewPdf(test.pdfUrl, test.title)}
                                            className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
                                        >
                                            <Eye size={18} /> View Test Paper
                                        </button>
                                    ) : (
                                        <button disabled className="w-full bg-gray-200 text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed">
                                            No PDF Available
                                        </button>
                                    )}

                                    {test.answerSheetUrl && (
                                        <button 
                                            onClick={() => handleViewPdf(test.answerSheetUrl, `${test.title} - Answer Key`)}
                                            className="w-full bg-white text-green-600 border border-green-600 font-bold py-2 px-4 rounded-lg hover:bg-green-50 transition flex items-center justify-center gap-2"
                                        >
                                            <FileText size={18} /> View Answer Key
                                        </button>
                                    )}

                                    {test.questions?.length > 0 && (
                                         <p className="text-xs text-gray-400 text-center mt-2">Legacy interactive questions available but hidden.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PDF Overlay Viewer */}
            {currentPdf && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-6xl h-full flex flex-col bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                        <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold truncate">{pdfTitle}</h2>
                            <button 
                                onClick={() => setCurrentPdf(null)}
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-200 relative">
                             {/* iframe with toolbar=0 to attempt hiding default PDF controls */}
                            <iframe 
                                src={`${currentPdf}#toolbar=0&navpanes=0&scrollbar=0`} 
                                className="w-full h-full" 
                                title="PDF Viewer"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Test;
