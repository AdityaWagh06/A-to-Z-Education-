import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, FileText, X, Eye } from 'lucide-react';
import { pdfjs } from 'react-pdf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Test = () => {
    const { subject } = useParams();
    const [searchParams] = useSearchParams();
    const standard = searchParams.get('standard');
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPdf, setCurrentPdf] = useState(null);
    const [pdfTitle, setPdfTitle] = useState('');
    const [pdfData, setPdfData] = useState(null);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pageWidth, setPageWidth] = useState(900);
    const [unlockingTestId, setUnlockingTestId] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    const canvasRef = useRef(null);

    const notify = (type, text) => {
        setStatusMessage({ type, text });
        setTimeout(() => setStatusMessage(null), 2500);
    };

    const getAuthConfig = () => {
        const token = localStorage.getItem('token');
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    useEffect(() => {
        fetchTests();
    }, [subject, standard]);

    const fetchTests = async () => {
        try {
            const standardQuery = standard ? `&standard=${standard}` : '';
            const res = await axios.get(`${API_URL}/api/tests?subject=${subject}${standardQuery}`, getAuthConfig());
            setTests(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleViewPdf = async (url, title) => {
        setPdfTitle(title);
        setCurrentPdf(url);
        setCurrentPage(1);
        setTotalPages(0);
        setPdfData(null);
        setPdfDocument(null);
        setPdfError('');
        setPdfLoading(true);

        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const fileBytes = new Uint8Array(response.data);
            setPdfData(fileBytes);

            const loadingTask = pdfjs.getDocument({ data: fileBytes });
            const loadedDoc = await loadingTask.promise;
            setPdfDocument(loadedDoc);
            setTotalPages(loadedDoc.numPages || 0);
            setCurrentPage(1);
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Could not load PDF file.';
            setPdfError(message);
        } finally {
            setPdfLoading(false);
        }
    };

    useEffect(() => {
        if (!pdfDocument || !canvasRef.current || !currentPage) return;

        let cancelled = false;

        const renderPage = async () => {
            try {
                const page = await pdfDocument.getPage(currentPage);
                const baseViewport = page.getViewport({ scale: 1 });
                const scale = pageWidth / baseViewport.width;
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport }).promise;
                if (cancelled) return;
            } catch (error) {
                if (!cancelled) {
                    setPdfError(error?.message || 'Could not render PDF page.');
                }
            }
        };

        renderPage();

        return () => {
            cancelled = true;
        };
    }, [pdfDocument, currentPage, pageWidth]);

    useEffect(() => {
        if (!currentPdf) return;

        const updatePageWidth = () => {
            const maxWidth = 900;
            const sidePadding = 120;
            const availableWidth = Math.max(320, window.innerWidth - sidePadding);
            setPageWidth(Math.min(maxWidth, availableWidth));
        };

        updatePageWidth();
        window.addEventListener('resize', updatePageWidth);
        return () => window.removeEventListener('resize', updatePageWidth);
    }, [currentPdf]);

    const handleOpenUnlockedTest = async (test) => {
        try {
            const { data } = await axios.get(`${API_URL}/api/tests/${test._id}`, getAuthConfig());
            if (!data?.pdfUrl) {
                notify('error', 'Test paper is not available yet.');
                return;
            }
            await handleViewPdf(data.pdfUrl, test.title);
        } catch (error) {
            console.error(error);
            notify('error', error?.response?.data?.message || 'Could not open test paper.');
        }
    };

    const handleOpenUnlockedAnswerSheet = async (test) => {
        try {
            const { data } = await axios.get(`${API_URL}/api/tests/${test._id}`, getAuthConfig());
            if (!data?.answerSheetUrl) {
                notify('error', 'Answer key is not available yet.');
                return;
            }
            await handleViewPdf(data.answerSheetUrl, `${test.title} - Answer Key`);
        } catch (error) {
            console.error(error);
            notify('error', error?.response?.data?.message || 'Could not open answer key.');
        }
    };

    const handleUnlock = async (test) => {
        const hasSdk = await loadRazorpayScript();
        if (!hasSdk) {
            notify('error', 'Failed to load Razorpay checkout. Please try again.');
            return;
        }

        setUnlockingTestId(test._id);

        try {
            const authConfig = getAuthConfig();

            const { data: order } = await axios.post(`${API_URL}/api/payments/order`, { testId: test._id }, authConfig);
            const { data: paymentConfig } = await axios.get(`${API_URL}/api/payments/config`);
            const keyId = paymentConfig?.keyId || RAZORPAY_KEY_ID;

            if (!order?.id) {
                throw new Error('Payment order could not be created.');
            }

            if (!keyId) {
                throw new Error('Razorpay key is missing. Please configure payment key.');
            }

            if (typeof window.Razorpay !== 'function') {
                throw new Error('Razorpay SDK failed to initialize.');
            }

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'A to Z Education',
                description: `Unlock ${test.title}`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        await axios.post(`${API_URL}/api/payments/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        }, authConfig);

                        notify('success', 'Payment successful. Opening your test...');
                        await fetchTests();
                        await handleOpenUnlockedTest(test);
                    } catch (verifyError) {
                        console.error(verifyError);
                        notify('error', verifyError?.response?.data?.message || 'Payment verification failed.');
                    } finally {
                        setUnlockingTestId(null);
                    }
                },
                prefill: {},
                theme: { color: '#4f46e5' },
                modal: {
                    ondismiss: () => setUnlockingTestId(null)
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error(error);
            notify('error', error?.response?.data?.message || error?.message || 'Could not start payment.');
            setUnlockingTestId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 capitalize">{subject} Tests</h1>
            {statusMessage && (
                <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {statusMessage.text}
                </div>
            )}

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
                                    {test.isLocked && test.price > 0 && !test.isPurchased && (
                                        <button
                                            onClick={() => handleUnlock(test)}
                                            disabled={unlockingTestId === test._id}
                                            className="w-full bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            <Lock size={16} /> {unlockingTestId === test._id ? 'Processing...' : `Pay ₹${test.price} & Unlock`}
                                        </button>
                                    )}

                                    {test.pdfUrl ? (
                                        <button 
                                            onClick={() => handleViewPdf(test.pdfUrl, test.title)}
                                            className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
                                        >
                                            <Eye size={18} /> View Test Paper
                                        </button>
                                    ) : (test.isLocked && test.price > 0 && test.isPurchased) ? (
                                        <button
                                            onClick={() => handleOpenUnlockedTest(test)}
                                            className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
                                        >
                                            <Eye size={18} /> Open Unlocked Test
                                        </button>
                                    ) : (
                                        <button disabled className="w-full bg-gray-200 text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed">
                                            No PDF Available
                                        </button>
                                    )}

                                    {test.answerSheetUrl ? (
                                        <button 
                                            onClick={() => handleViewPdf(test.answerSheetUrl, `${test.title} - Answer Key`)}
                                            className="w-full bg-white text-green-600 border border-green-600 font-bold py-2 px-4 rounded-lg hover:bg-green-50 transition flex items-center justify-center gap-2"
                                        >
                                            <FileText size={18} /> View Answer Key
                                        </button>
                                    ) : (test.isLocked && test.price > 0 && test.isPurchased && test.hasAnswerSheet) ? (
                                        <button
                                            onClick={() => handleOpenUnlockedAnswerSheet(test)}
                                            className="w-full bg-white text-green-600 border border-green-600 font-bold py-2 px-4 rounded-lg hover:bg-green-50 transition flex items-center justify-center gap-2"
                                        >
                                            <FileText size={18} /> Open Answer Key
                                        </button>
                                    ) : null}

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
                                onClick={() => {
                                    setCurrentPdf(null);
                                    setPdfData(null);
                                    setPdfDocument(null);
                                    setPdfError('');
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between bg-gray-800/80 border-y border-gray-700 px-4 py-2 text-white text-sm">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage <= 1}
                                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Previous Page
                            </button>
                            <span>
                                Page {currentPage} of {totalPages || '--'}
                            </span>
                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages || prev, prev + 1))}
                                disabled={!totalPages || currentPage >= totalPages}
                                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next Page
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-200 overflow-auto p-4 flex justify-center">
                            {pdfLoading ? (
                                <p className="text-gray-700">Loading PDF...</p>
                            ) : pdfError ? (
                                <div className="text-center text-red-600">
                                    <p className="font-semibold">Could not load PDF.</p>
                                    <p className="text-sm mt-1">{pdfError}</p>
                                </div>
                            ) : pdfData && pdfDocument ? (
                                <canvas ref={canvasRef} className="shadow-lg bg-white rounded" />
                            ) : (
                                <p className="text-gray-700">Select a PDF to view.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Test;
