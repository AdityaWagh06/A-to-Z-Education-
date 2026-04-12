import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FileText, X, Eye, ChevronRight, ShieldCheck } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Test = () => {
    const { subject, standard: routeStandard } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
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

        const silentRefresh = () => {
            Promise.all([fetchTests(), fetchPaidStandardBoxes(), fetchStandards()]).catch(() => {});
        };

        const refreshIfVisible = () => {
            if (document.visibilityState === 'visible') {
                silentRefresh();
            }
        };

        loadData();
        const intervalId = window.setInterval(silentRefresh, 15000);
        window.addEventListener('focus', refreshIfVisible);
        document.addEventListener('visibilitychange', refreshIfVisible);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', refreshIfVisible);
            document.removeEventListener('visibilitychange', refreshIfVisible);
        };
    }, [subject]);

    useEffect(() => {
        if (activeStandard) {
            setSelectedCategory('free');
        } else {
            setSelectedCategory(null);
        }
    }, [activeStandard]);

    useEffect(() => {
        if (!activeStandard && user?.standard) {
            navigate(`/student/tests/${Number(user.standard)}`, { replace: true });
        }
    }, [activeStandard, user?.standard, navigate]);

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

    const paidBoxesByStandard = new Map();
    for (const box of derivedPaidBoxes) {
        paidBoxesByStandard.set(Number(box.standard), box);
    }
    for (const box of configuredPaidBoxes) {
        paidBoxesByStandard.set(Number(box.standard), box);
    }
    const paidBoxes = Array.from(paidBoxesByStandard.values()).sort((a, b) => Number(a.standard) - Number(b.standard));
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
            notify('error', 'Paid test price is not configured yet by admin.');
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

    const renderTestRow = (test) => (
        <div key={test._id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
            <div className="lg:col-span-5">
                <p className="font-semibold text-gray-900">{test.title}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{test.subject} | Standard {test.standard}</p>
            </div>
            <div className="lg:col-span-2">
                <span className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700">
                    {test.questions?.length > 0 ? `${test.questions.length} Qs` : 'PDF Test'}
                </span>
            </div>
            <div className="lg:col-span-2">
                <span className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-medium ${test.isLocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {test.isLocked ? 'Paid' : 'Free'}
                </span>
            </div>
            <div className="lg:col-span-3 flex flex-wrap gap-2">
                <button
                    onClick={() => test.pdfUrl ? handleViewPdf(test.pdfUrl, test.title) : handleOpenUnlockedTest(test)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-100"
                >
                    <Eye size={15} /> Paper
                </button>
                {(test.answerSheetUrl || test.hasAnswerSheet) && (
                    <button
                        onClick={() => test.answerSheetUrl ? handleViewPdf(test.answerSheetUrl, `${test.title} - Answer Key`) : handleOpenUnlockedAnswerSheet(test)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-100"
                    >
                        <FileText size={15} /> Key
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
                    <h1 className="text-3xl font-bold text-gray-900">Test Center</h1>
                    <p className="text-gray-600 mt-2">Choose your standard, then access Free or Paid tests in a structured list.</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-gray-700">
                        <span className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1">Free Tests: {freeTests.length}</span>
                        <span className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1">Paid Tests: {tests.filter((test) => test.isLocked).length}</span>
                        <span className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1">Total: {tests.length}</span>
                    </div>
                </div>

            {!loading && standardsToShow.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Choose Standard</p>
                    <div className="flex flex-wrap gap-2">
                        {standardsToShow.map((std) => {
                            const stdValue = Number(std.value);
                            const isActiveStandard = Number(activeStandard) === stdValue;
                            return (
                                <button
                                    key={std.id || std.value}
                                    type="button"
                                    onClick={() => navigate(`/student/tests/${stdValue}`)}
                                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${isActiveStandard ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-700'}`}
                                >
                                    {std.label || `Standard ${stdValue}`}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {statusMessage && (
                <div className="fixed top-4 right-4 z-[120] w-[min(92vw,420px)]">
                    <div className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {statusMessage.text}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-600">Loading tests...</div>
            ) : !activeStandard && standardsToShow.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-xl text-gray-500">No tests available yet.</p>
                </div>
            ) : !activeStandard ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-2xl shadow-sm p-8 text-center text-gray-600">
                    Choose a standard from the boxes above to view tests.
                </div>
            ) : (
                <div className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-2xl font-extrabold text-gray-900">Standard {activeStandard}</h2>
                        <span className="text-xs text-gray-500">Switch standard from top boxes</span>
                    </div>

                    <div className="mb-6 border-b border-gray-200">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('free')}
                                className={`px-4 py-2.5 text-sm font-semibold rounded-t-md border border-b-0 transition ${selectedCategory === 'free' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-600 border-transparent hover:text-blue-700'}`}
                            >
                                Free Tests ({selectedFreeTests.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('paid')}
                                className={`px-4 py-2.5 text-sm font-semibold rounded-t-md border border-b-0 transition ${selectedCategory === 'paid' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-600 border-transparent hover:text-blue-700'}`}
                            >
                                Paid Tests ({selectedPaidTests.length})
                            </button>
                        </div>
                    </div>

                    {selectedCategory === 'free' && (
                        selectedFreeTests.length === 0 ? (
                            <p className="text-gray-500 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">No free tests in this standard yet.</p>
                        ) : (
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 py-3 bg-gray-100 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    <div className="lg:col-span-5">Test</div>
                                    <div className="lg:col-span-2">Format</div>
                                    <div className="lg:col-span-2">Access</div>
                                    <div className="lg:col-span-3">Actions</div>
                                </div>
                                {selectedFreeTests.map(renderTestRow)}
                            </div>
                        )
                    )}

                    {selectedCategory === 'paid' && (
                        !selectedPaidBox ? (
                            <p className="text-gray-500 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">Paid tests for Standard {activeStandard} are not configured by admin yet.</p>
                        ) : !isSelectedPaidUnlocked ? (
                            <div className="border border-gray-300 rounded-xl p-5 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={18} /> Premium Access Required</p>
                                    <p className="text-sm text-gray-700">Unlock all paid tests for Standard {activeStandard} with a one-time payment.</p>
                                </div>
                                <button
                                    onClick={() => openUnlockDialog(activeStandard, selectedPaidAmount)}
                                    disabled={unlockingTestId === `std-${activeStandard}` || selectedPaidAmount <= 0}
                                    className="bg-gray-900 text-white font-semibold py-2.5 px-4 rounded-md hover:bg-black transition disabled:opacity-60"
                                >
                                    {unlockingTestId === `std-${activeStandard}` ? 'Processing...' : `Proceed Payment - Rs ${selectedPaidAmount}`}
                                </button>
                            </div>
                        ) : (
                            selectedPaidTests.length === 0 ? (
                                <p className="text-gray-500 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">No paid tests in this standard yet.</p>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 py-3 bg-gray-100 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        <div className="lg:col-span-5">Test</div>
                                        <div className="lg:col-span-2">Format</div>
                                        <div className="lg:col-span-2">Access</div>
                                        <div className="lg:col-span-3">Actions</div>
                                    </div>
                                    {selectedPaidTests.map(renderTestRow)}
                                </div>
                            )
                        )
                    )}
                </div>
            )}

            {unlockDialog && (
                <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="bg-gray-900 text-white p-5">
                            <h3 className="text-xl font-bold">Unlock Paid Tests</h3>
                            <p className="text-sm opacity-90 mt-1">Standard {unlockDialog.standard} Premium Access</p>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-700">
                                You are about to unlock all paid tests for Standard {unlockDialog.standard}. This is a one-time payment.
                            </p>

                            <div className="rounded-lg border bg-gray-50 p-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-2xl font-extrabold text-gray-900">Rs {unlockDialog.amount}</span>
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
                                    className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black"
                                >
                                    Proceed to Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default Test;
