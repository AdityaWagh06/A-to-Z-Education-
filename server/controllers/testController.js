const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { getSupabaseAdmin } = require('../config/supabase');

const buildFileUrl = (req, relativePath) => encodeURI(`${req.protocol}://${req.get('host')}${relativePath}`);
const sanitizeUploadName = (fileName) => path.basename(String(fileName || 'file')).replace(/[^a-zA-Z0-9._-]/g, '_');

const isMissingColumnError = (error, columnName) => {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return details.includes('column') && details.includes(String(columnName || '').toLowerCase());
};

const getOptionalAuthUser = async (req, supabase) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) return null;

        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const primary = await supabase
            .from('users')
            .select('id, role, purchased_tests, purchased_standard_boxes')
            .eq('id', decoded.id)
            .maybeSingle();

        if (primary.error && isMissingColumnError(primary.error, 'purchased_standard_boxes')) {
            const fallback = await supabase
                .from('users')
                .select('id, role, purchased_tests')
                .eq('id', decoded.id)
                .maybeSingle();

            if (fallback.error || !fallback.data) return null;
            return {
                ...fallback.data,
                purchased_standard_boxes: [],
            };
        }

        if (primary.error || !primary.data) return null;
        return primary.data;
    } catch {
        return null;
    }
};

// @desc    Get all tests
// @route   GET /api/tests
// @access  Public
const getTests = async (req, res) => {
    const { standard, subject } = req.query;
    try {
        const supabase = getSupabaseAdmin();
        const authUser = await getOptionalAuthUser(req, supabase);
        const purchasedSet = new Set(authUser?.purchased_tests || []);
        const purchasedStandardSet = new Set((authUser?.purchased_standard_boxes || []).map((value) => Number(value)));
        const isAdmin = authUser?.role === 'admin';

        let query = supabase.from('tests').select('*').order('created_at', { ascending: false });

        if (standard) query = query.eq('standard', Number(standard));
        if (subject) query = query.eq('subject', subject);

        const { data, error } = await query;
        if (error) throw error;

        return res.json((data || []).map((t) => {
            const isStandardPurchased = purchasedStandardSet.has(Number(t.standard));
            const isPurchased = purchasedSet.has(t.id) || isStandardPurchased;
            const hideContent = t.is_locked && !isPurchased && !isAdmin;

            return {
                _id: t.id,
                title: t.title,
                subject: t.subject,
                standard: t.standard,
                price: t.price,
                pdfUrl: !hideContent && t.pdf_path ? buildFileUrl(req, t.pdf_path) : null,
                answerSheetUrl: !hideContent && t.answer_sheet_path ? buildFileUrl(req, t.answer_sheet_path) : null,
                hasPdf: Boolean(t.pdf_path),
                hasAnswerSheet: Boolean(t.answer_sheet_path),
                isPurchased,
                isStandardPurchased,
                questions: t.questions || [],
                timeLimit: t.time_limit,
                isLocked: t.is_locked,
                createdAt: t.created_at
            };
        }));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single test
// @route   GET /api/tests/:id
// @access  Protected
const getTestById = async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { data: test, error } = await supabase
            .from('tests')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !test) return res.status(404).json({ message: 'Test not found' });

        // Check if locked and unpaid
        if (test.is_locked) {
            // Check if user purchased
            let user = null;
            const userPrimary = await supabase
                .from('users')
                .select('purchased_tests, purchased_standard_boxes')
                .eq('id', req.user.id)
                .single();

            if (userPrimary.error && isMissingColumnError(userPrimary.error, 'purchased_standard_boxes')) {
                const userFallback = await supabase
                    .from('users')
                    .select('purchased_tests')
                    .eq('id', req.user.id)
                    .single();

                if (userFallback.error) throw userFallback.error;
                user = {
                    ...userFallback.data,
                    purchased_standard_boxes: [],
                };
            } else {
                if (userPrimary.error) throw userPrimary.error;
                user = userPrimary.data;
            }
            
            const purchasedByTest = (user?.purchased_tests || []).includes(test.id);
            const purchasedByStandardBox = (user?.purchased_standard_boxes || []).includes(Number(test.standard));
            const purchased = purchasedByTest || purchasedByStandardBox;
            if (!purchased && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Test is locked. Purchase required.' });
            }
        }

        res.json({
            ...test,
            pdfUrl: test.pdf_path ? buildFileUrl(req, test.pdf_path) : null,
            answerSheetUrl: test.answer_sheet_path ? buildFileUrl(req, test.answer_sheet_path) : null,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a test (PDF Upload)
// @route   POST /api/tests
// @access  Admin
const createTest = async (req, res) => {
    try {
        if (!req.files || !req.files.pdf) {
            return res.status(400).json({ message: 'No PDF file uploaded' });
        }

        const { title, subject, standard, price, isLocked } = req.body;
        const pdfFile = req.files.pdf;
        const answerSheetFile = req.files.answerSheet;

        // Save PDF locally
        const pdfName = `test-${Date.now()}-${sanitizeUploadName(pdfFile.name)}`;
        const pdfPath = path.join(__dirname, '../uploads/tests', pdfName);
        
        // Ensure directory exists
        const uploadDir = path.join(__dirname, '../uploads/tests');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        await pdfFile.mv(pdfPath);
        const relativePdfPath = `/uploads/tests/${pdfName}`;

        let relativeAnswerSheetPath = null;
        if (answerSheetFile) {
            const answerName = `answers-${Date.now()}-${sanitizeUploadName(answerSheetFile.name)}`;
            const answerPath = path.join(__dirname, '../uploads/tests', answerName);
            await answerSheetFile.mv(answerPath);
            relativeAnswerSheetPath = `/uploads/tests/${answerName}`;
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('tests')
            .insert([{
                title,
                subject,
                standard: Number(standard),
                price: Number(price) || 0,
                is_locked: isLocked === 'true' || isLocked === true,
                pdf_path: relativePdfPath,
                answer_sheet_path: relativeAnswerSheetPath,
                questions: [] // Default empty for PDF tests
            }])
            .select('*')
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a test result (Update Progress)
// @route   POST /api/tests/:id/submit
// @access  Protected
const submitTest = async (req, res) => {
    const { score, totalQuestions } = req.body;
    try {
        const supabase = getSupabaseAdmin();
        
        // 1. Get Test Details (for Subject)
        const { data: test, error: testError } = await supabase
            .from('tests')
            .select('subject')
            .eq('id', req.params.id)
            .single();

        if (testError || !test) return res.status(404).json({ message: 'Test not found' });

        // 2. Get User Progress
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('progress')
            .eq('id', req.user.id)
            .single();

        if (userError) throw userError;

        const progress = user.progress || {};
        const subject = test.subject.toLowerCase(); // Ensure lowercase key
        
        if (!progress[subject]) {
            progress[subject] = { lessonsCompleted: [], testsTaken: [] };
        }

        // Add result
        progress[subject].testsTaken.push({
            testId: req.params.id,
            score: Number(score),
            totalQuestions: Number(totalQuestions),
            date: new Date().toISOString()
        });

        // 3. Update User
        const { error: updateError } = await supabase
            .from('users')
            .update({ progress })
            .eq('id', req.user.id);

        if (updateError) throw updateError;

        res.json({ message: 'Test submitted successfully', progress });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const deleteTest = async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('tests').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Test deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTest = async (req, res) => {
    try {
        const { title, subject, standard, price, isLocked } = req.body;
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('tests')
            .update({
                title,
                subject,
                standard: Number(standard),
                price: Number(price) || 0,
                is_locked: isLocked === 'true' || isLocked === true
            })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPaidStandardBoxes = async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const authUser = await getOptionalAuthUser(req, supabase);
        const purchasedStandardSet = new Set(authUser?.purchased_standard_boxes || []);

        const [{ data: boxes, error: boxesError }, { data: paidTests, error: paidTestsError }] = await Promise.all([
            supabase
                .from('paid_standard_boxes')
                .select('*')
                .order('standard', { ascending: true }),
            supabase
                .from('tests')
                .select('id, standard')
                .eq('is_locked', true),
        ]);

        if (boxesError) throw boxesError;
        if (paidTestsError) throw paidTestsError;

        const testsByStandard = {};
        for (const test of (paidTests || [])) {
            const standardValue = Number(test.standard);
            if (!testsByStandard[standardValue]) testsByStandard[standardValue] = [];
            testsByStandard[standardValue].push(test.id);
        }

        return res.json((boxes || []).map((b) => ({
            _id: b.id,
            standard: Number(b.standard),
            title: b.title,
            description: b.description,
            amount: Number(b.amount || 0),
            isActive: Boolean(b.is_active),
            assignedTestIds: testsByStandard[Number(b.standard)] || [],
            testsCount: (testsByStandard[Number(b.standard)] || []).length,
            isPurchased: purchasedStandardSet.has(Number(b.standard)),
            createdAt: b.created_at,
        })));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const upsertPaidStandardBox = async (req, res) => {
    try {
        const { standard, amount, title, description, isActive = true } = req.body;

        const standardNumber = Number(standard);
        const amountNumber = Number(amount);

        if (!Number.isInteger(standardNumber) || standardNumber < 2 || standardNumber > 10) {
            return res.status(400).json({ message: 'Standard must be between 2 and 10.' });
        }

        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0.' });
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('paid_standard_boxes')
            .upsert([{
                standard: standardNumber,
                amount: amountNumber,
                title: title || `Standard ${standardNumber} Premium Box`,
                description: description || null,
                is_active: isActive,
            }], { onConflict: 'standard' })
            .select('*')
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deletePaidStandardBox = async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('paid_standard_boxes').delete().eq('id', id);
        if (error) throw error;
        return res.json({ message: 'Paid standard box deleted.' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTests,
    getTestById,
    createTest,
    submitTest,
    deleteTest,
    updateTest,
    getPaidStandardBoxes,
    upsertPaidStandardBox,
    deletePaidStandardBox,
};
