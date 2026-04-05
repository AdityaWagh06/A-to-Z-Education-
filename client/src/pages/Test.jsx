import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, FileText, X, Eye } from 'lucide-react';
import { pdfjs } from 'react-pdf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Test = () => {
    const { subject, standard: routeStandard } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [tests, setTests] = useState([]);
    const [standards, setStandards] = useState([]);
    const [paidStandardBoxes, setPaidStandardBoxes] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
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
    const [unlockDialog, setUnlockDialog] = useState(null);
    const canvasRef = useRef(null);

    const queryStandard = searchParams.get('standard');
    const activeStandard = Number(routeStandard || queryStandard || 0) || null;

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
        const loadData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchTests(), fetchPaidStandardBoxes(), fetchStandards()]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [subject]);

    useEffect(() => {
        setSelectedCategory(null);
    }, [activeStandard]);

    const fetchTests = async () => {
        try {
            const subjectQuery = subject ? `?subject=${subject}` : '';
            const res = await axios.get(`${API_URL}/api/tests${subjectQuery}`, getAuthConfig());
            setTests(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStandards = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/standards`);
            const sorted = (Array.isArray(data) ? data : []).sort((a, b) => Number(a.value) - Number(b.value));
            setStandards(sorted);
        } catch (error) {
            console.error(error);
            setStandards([]);
        }
    };

    const fetchPaidStandardBoxes = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/tests/paid-standard-boxes`, getAuthConfig());
            setPaidStandardBoxes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setPaidStandardBoxes([]);
        }
    };

    const freeTests = tests.filter((test) => !test.isLocked);
    const configuredPaidBoxes = paidStandardBoxes.filter((box) => box.isActive !== false);
    const derivedPaidBoxes = Object.values(
        tests
            .filter((test) => test.isLocked)
            .reduce((acc, test) => {
                const standardValue = Number(test.standard);
                if (!acc[standardValue]) {
                    acc[standardValue] = {
                        _id: `derived-${standardValue}`,
                        standard: standardValue,
                        title: `Standard ${standardValue} Paid Test Box`,
                        description: 'Auto-created from paid tests in this standard.',
                        amount: Number(test.price || 0),
                        isActive: true,
                        isPurchased: Boolean(test.isPurchased || test.isStandardPurchased),
                        testsCount: 0,
                    };
                }

                acc[standardValue].amount = Math.max(acc[standardValue].amount, Number(test.price || 0));
                acc[standardValue].isPurchased = acc[standardValue].isPurchased || Boolean(test.isPurchased || test.isStandardPurchased);
                acc[standardValue].testsCount += 1;
                return acc;
            }, {})
    );

    const paidBoxes = configuredPaidBoxes.length > 0 ? configuredPaidBoxes : derivedPaidBoxes;
    const derivedStandards = Object.values(
        tests.reduce((acc, test) => {
            const value = Number(test.standard);
            if (!acc[value]) {
                acc[value] = { id: `derived-${value}`, value, label: `Standard ${value}` };
            }
            return acc;
        }, {})
    );
    const standardsToShow = standards.length > 0 ? standards : derivedStandards;

    const selectedTests = activeStandard
        ? tests.filter((test) => Number(test.standard) === Number(activeStandard))
        : [];
    const selectedFreeTests = selectedTests.filter((test) => !test.isLocked);
    const selectedPaidTests = selectedTests.filter((test) => test.isLocked);
    const selectedPaidBox = paidBoxes.find((box) => Number(box.standard) === Number(activeStandard));
    const selectedPaidAmount = Number(selectedPaidBox?.amount || 0);
    const isSelectedPaidUnlocked = Boolean(
        selectedPaidBox?.isPurchased || selectedPaidTests.some((test) => test.isPurchased || test.isStandardPurchased)
    );

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

    const handleUnlockStandardBox = async (box) => {
        const hasSdk = await loadRazorpayScript();
        if (!hasSdk) {
            notify('error', 'Failed to load Razorpay checkout. Please try again.');
            return;
        }

        setUnlockingTestId(`std-${box.standard}`);

        try {
            const authConfig = getAuthConfig();
            const { data: order } = await axios.post(`${API_URL}/api/payments/standard-box/order`, { standard: box.standard }, authConfig);
            const { data: paymentConfig } = await axios.get(`${API_URL}/api/payments/config`);
            const keyId = paymentConfig?.keyId || RAZORPAY_KEY_ID;

            if (!order?.id) {
                throw new Error('Payment order could not be created.');
            }

            if (!keyId) {
                throw new Error('Razorpay key is missing. Please configure payment key.');
            }

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'A to Z Education',
                description: `Unlock Standard ${box.standard} Paid Tests`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        await axios.post(`${API_URL}/api/payments/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            payment_type: 'standard_box',
                            standard_value: Number(box.standard)
                        }, authConfig);

                        notify('success', `Standard ${box.standard} box unlocked successfully.`);
                        await Promise.all([fetchTests(), fetchPaidStandardBoxes()]);
                    } catch (verifyError) {
                        console.error(verifyError);
                        notify('error', verifyError?.response?.data?.message || 'Payment verification failed.');
                    } finally {
                        setUnlockingTestId(null);
                    }
                },
                modal: {
                    ondismiss: () => setUnlockingTestId(null)
                },
                theme: { color: '#4f46e5' },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error(error);
            notify('error', error?.response?.data?.message || error?.message || 'Could not start payment.');
            setUnlockingTestId(null);
        }
    };

    const openUnlockDialog = (standard, amount) => {
        if (!amount || Number(amount) <= 0) {
            notify('error', 'Paid box price is not configured yet by admin.');
            return;
        }

        setUnlockDialog({ standard: Number(standard), amount: Number(amount) });
    };

    const confirmUnlockDialog = async () => {
        if (!unlockDialog) return;
        const box = { standard: unlockDialog.standard, amount: unlockDialog.amount, title: `Standard ${unlockDialog.standard}` };
        setUnlockDialog(null);
        await handleUnlockStandardBox(box);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-3">Tests</h1>
            <p className="text-gray-600 mb-6">Choose a standard first, then open Free Tests or Paid Tests.</p>
            {statusMessage && (
                <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {statusMessage.text}
                </div>
            )}

            {loading ? (
                <p>Loading tests...</p>
            ) : !activeStandard && standardsToShow.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-xl text-gray-500">No tests available yet.</p>
                </div>
            ) : !activeStandard ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {standardsToShow.map((std) => {
                        const stdValue = Number(std.value);
                        const stdTests = tests.filter((test) => Number(test.standard) === stdValue);
                        const stdFree = stdTests.filter((test) => !test.isLocked).length;
                        const stdPaid = stdTests.filter((test) => test.isLocked).length;

                        return (
                        <button
                            key={std.id || std.value}
                            type="button"
                            onClick={() => {
                                navigate(`/student/tests/${stdValue}`);
                            }}
                            className="text-left bg-white rounded-card shadow-md overflow-hidden hover:shadow-lg transition"
                        >
                            <div className="bg-primary p-4 text-white">
                                <h3 className="text-xl font-bold">{std.label || `Standard ${stdValue}`}</h3>
                                <div className="flex justify-between items-center mt-2 text-sm opacity-90">
                                    <span>{stdTests.length} Total Tests</span>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex gap-2 text-xs">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">Free: {stdFree}</span>
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded">Paid: {stdPaid}</span>
                                </div>
                            </div>
                        </button>
                    );})}
                </div>
            ) : (
                <div className="mt-2 bg-white border rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-2xl font-bold text-gray-900">Standard {activeStandard}</h2>
                        <button
                            type="button"
                            onClick={() => {
                                navigate('/student/tests');
                                setSelectedCategory(null);
                            }}
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Back to Standards
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('free')}
                            className={`text-left bg-white rounded-card shadow-md overflow-hidden hover:shadow-lg transition border ${selectedCategory === 'free' ? 'border-primary' : 'border-gray-200'}`}
                        >
                            <div className="bg-primary p-4 text-white">
                                <h3 className="text-xl font-bold">Free Tests</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-700">{selectedFreeTests.length} tests available</p>
                                <p className="text-sm text-gray-700 mt-1">No payment required</p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCategory('free');
                                    }}
                                    className="mt-3 inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-opacity-90"
                                >
                                    Open Free Tests
                                </button>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedCategory('paid')}
                            className={`text-left bg-white rounded-card shadow-md overflow-hidden hover:shadow-lg transition border ${selectedCategory === 'paid' ? 'border-primary' : 'border-gray-200'}`}
                        >
                            <div className="bg-primary p-4 text-white">
                                <h3 className="text-xl font-bold">Paid Tests</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-700">{selectedPaidTests.length} tests available</p>
                                <p className="text-sm text-gray-700 mt-1">{isSelectedPaidUnlocked ? 'Unlocked for your account' : `One-time unlock: ₹${selectedPaidAmount}`}</p>
                                {isSelectedPaidUnlocked ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCategory('paid');
                                        }}
                                        className="mt-3 inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-opacity-90"
                                    >
                                        Unlock Paid Tests
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openUnlockDialog(activeStandard, selectedPaidAmount);
                                        }}
                                        disabled={!selectedPaidBox || selectedPaidAmount <= 0 || unlockingTestId === `std-${activeStandard}`}
                                        className="mt-3 inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-opacity-90 disabled:opacity-60"
                                    >
                                        {unlockingTestId === `std-${activeStandard}` ? 'Processing...' : 'Unlock Paid Tests'}
                                    </button>
                                )}
                            </div>
                        </button>
                    </div>

                    {selectedCategory === 'free' && (
                        selectedFreeTests.length === 0 ? (
                            <p className="text-gray-500">No free tests in this standard yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedFreeTests.map((test) => (
                                    <div key={test._id} className="bg-white rounded-card shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100">
                                        <div className="bg-gray-800 p-4 text-white">
                                            <h3 className="text-xl font-bold">{test.title}</h3>
                                            <div className="flex justify-between items-center mt-2 text-sm opacity-90">
                                                <span>{test.questions?.length > 0 ? `${test.questions.length} Questions` : 'PDF Test'}</span>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => test.pdfUrl ? handleViewPdf(test.pdfUrl, test.title) : handleOpenUnlockedTest(test)}
                                                    className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
                                                >
                                                    <Eye size={18} /> View Test Paper
                                                </button>

                                                {(test.answerSheetUrl || test.hasAnswerSheet) && (
                                                    <button
                                                        onClick={() => test.answerSheetUrl ? handleViewPdf(test.answerSheetUrl, `${test.title} - Answer Key`) : handleOpenUnlockedAnswerSheet(test)}
                                                        className="w-full bg-white text-green-600 border border-green-600 font-bold py-2 px-4 rounded-lg hover:bg-green-50 transition flex items-center justify-center gap-2"
                                                    >
                                                        <FileText size={18} /> View Answer Key
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {selectedCategory === 'paid' && (
                        !selectedPaidBox ? (
                            <p className="text-gray-500">Paid box for Standard {activeStandard} is not configured by admin yet.</p>
                        ) : !isSelectedPaidUnlocked ? (
                            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-gray-800">Standard {activeStandard} paid box is locked.</p>
                                    <p className="text-sm text-gray-600">Unlock once to access all paid tests in this standard.</p>
                                </div>
                                <button
                                    onClick={() => openUnlockDialog(activeStandard, selectedPaidAmount)}
                                    disabled={unlockingTestId === `std-${activeStandard}` || selectedPaidAmount <= 0}
                                    className="bg-gray-900 text-white font-bold py-2 px-4 rounded-lg hover:bg-black transition disabled:opacity-60"
                                >
                                    {unlockingTestId === `std-${activeStandard}` ? 'Processing...' : `Unlock Paid Tests - ₹${selectedPaidAmount}`}
                                </button>
                            </div>
                        ) : (
                            selectedPaidTests.length === 0 ? (
                                <p className="text-gray-500">No paid tests in this standard yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedPaidTests.map((test) => (
                                        <div key={test._id} className="bg-white rounded-card shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100">
                                            <div className="bg-gray-800 p-4 text-white">
                                                <h3 className="text-xl font-bold">{test.title}</h3>
                                                <div className="flex justify-between items-center mt-2 text-sm opacity-90">
                                                    <span>{test.questions?.length > 0 ? `${test.questions.length} Questions` : 'PDF Test'}</span>
                                                </div>
                                            </div>

                                            <div className="p-6">
                                                <div className="space-y-3">
                                                    <button
                                                        onClick={() => test.pdfUrl ? handleViewPdf(test.pdfUrl, test.title) : handleOpenUnlockedTest(test)}
                                                        className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
                                                    >
                                                        <Eye size={18} /> View Test Paper
                                                    </button>

                                                    {(test.answerSheetUrl || test.hasAnswerSheet) && (
                                                        <button
                                                            onClick={() => test.answerSheetUrl ? handleViewPdf(test.answerSheetUrl, `${test.title} - Answer Key`) : handleOpenUnlockedAnswerSheet(test)}
                                                            className="w-full bg-white text-green-600 border border-green-600 font-bold py-2 px-4 rounded-lg hover:bg-green-50 transition flex items-center justify-center gap-2"
                                                        >
                                                            <FileText size={18} /> View Answer Key
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )
                    )}
                </div>
            )}

            {unlockDialog && (
                <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="bg-primary text-white p-5">
                            <h3 className="text-xl font-bold">Unlock Paid Tests</h3>
                            <p className="text-sm opacity-90 mt-1">Standard {unlockDialog.standard} Premium Access</p>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-700">
                                You are about to unlock all paid tests for Standard {unlockDialog.standard}. This is a one-time payment.
                            </p>

                            <div className="rounded-lg border bg-gray-50 p-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-2xl font-extrabold text-gray-900">₹{unlockDialog.amount}</span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setUnlockDialog(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmUnlockDialog}
                                    className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-opacity-90"
                                >
                                    Proceed to Payment
                                </button>
                            </div>
                        </div>
                    </div>
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
