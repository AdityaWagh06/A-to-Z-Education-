const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Test = require('../models/Test');
const Payment = require('../models/Payment'); 
const { isSupabaseEnabled, getSupabaseAdmin } = require('../config/supabase');

const TESTS_FILE = path.join(__dirname, '../data/tests.json');

// Helper to read/write file-based tests
const getFileTests = () => {
    if (!fs.existsSync(TESTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(TESTS_FILE, 'utf8'));
    } catch (err) {
        console.error('Error reading tests.json:', err);
        return [];
    }
};

const saveFileTests = (tests) => {
    fs.writeFileSync(TESTS_FILE, JSON.stringify(tests, null, 2));
};

// @desc    Get all tests
// @route   GET /api/tests
// @access  Public
const getTests = async (req, res) => {
    const { standard, subject } = req.query;
    try {
        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            let query = supabase.from('tests').select('*').order('created_at', { ascending: false });
            if (standard) query = query.eq('standard', Number(standard));
            if (subject) query = query.eq('subject', subject);
            const { data, error } = await query;
            if (error) throw error;

            return res.json((data || []).map((t) => ({
                _id: t.id,
                title: t.title,
                subject: t.subject,
                standard: t.standard,
                price: t.price,
                pdfUrl: t.pdf_path,
                answerSheetUrl: t.answer_sheet_path,
                questions: t.questions || [],
                timeLimit: t.time_limit,
                isLocked: t.is_locked,
                createdAt: t.created_at
            })));
        }

        // Get file-based tests first (always available as fallback/supplement)
        let fileTests = getFileTests();
        if (standard) fileTests = fileTests.filter(t => t.standard === Number(standard));
        if (subject) fileTests = fileTests.filter(t => t.subject === subject);
        
        fileTests = fileTests.map((t) => ({
            ...t,
            pdfUrl: t.pdfPath ? `${req.protocol}://${req.get('host')}${t.pdfPath}` : null,
            answerSheetUrl: t.answerSheetPath ? `${req.protocol}://${req.get('host')}${t.answerSheetPath}` : null
        }));

        let mongoTests = [];
        try {
            if (mongoose.connection.readyState === 1) {
                const query = {};
                if (standard) query.standard = Number(standard);
                if (subject) query.subject = subject;
                const mTests = await Test.find(query).sort({ createdAt: -1 });
                
                mongoTests = mTests.map((t) => {
                    const testObj = t.toObject ? t.toObject() : t;
                    return {
                        ...testObj,
                        pdfUrl: testObj.pdfPath ? `${req.protocol}://${req.get('host')}${testObj.pdfPath}` : null,
                        answerSheetUrl: testObj.answerSheetPath ? `${req.protocol}://${req.get('host')}${testObj.answerSheetPath}` : null
                    };
                });
            }
        } catch (dbError) {
            console.warn('Database unavailable, using only file-based tests:', dbError.message);
        }

        // Merge tests (prefer file tests for simplicity if duplicates exist, but IDs are unique)
        // Sort by creation date descending
        const allTests = [...fileTests, ...mongoTests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return res.json(allTests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single test
// @route   GET /api/tests/:id
// @access  Protected
const getTestById = async (req, res) => {
    try {
        if (isSupabaseEnabled()) {
             const supabase = getSupabaseAdmin();
            const { data: test, error } = await supabase.from('tests').select('*').eq('id', req.params.id).single();
             if (error || !test) return res.status(404).json({ message: 'Test not found' });
             return res.json(test);
        }

        let test = null;
        try {
             if (mongoose.connection.readyState === 1) {
                 // Try to find in MongoDB
                 // Validate ID format for Mongo first
                 if (mongoose.Types.ObjectId.isValid(req.params.id)) {
                    test = await Test.findById(req.params.id);
                 }
             }
        } catch (err) {
            console.warn('Error fetching from DB, checking file store:', err.message);
        }

        if (!test) {
            // Check file store
            const tests = getFileTests();
            test = tests.find(t => t._id === req.params.id);
        }

        if (test) {
            // Convert to object if mongoose doc
            const testObj = test.toObject ? test.toObject() : test;
            
            // Add URLs
            const testWithUrls = {
                ...testObj,
                pdfUrl: testObj.pdfPath ? `${req.protocol}://${req.get('host')}${testObj.pdfPath}` : null,
                answerSheetUrl: testObj.answerSheetPath ? `${req.protocol}://${req.get('host')}${testObj.answerSheetPath}` : null
            };

            res.json(testWithUrls);
        } else {
            res.status(404).json({ message: 'Test not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a test
// @route   POST /api/tests
// @access  Admin
const createTest = async (req, res) => {
    try {
        console.log("createTest Request Body:", req.body);
        const { title, subject, standard, price, isLocked } = req.body;
        let pdfPath = null;
        let answerSheetPath = null;

        if (req.files) {
            if (req.files.pdf) {
                const pdfFile = req.files.pdf;
                const pdfName = `test-${Date.now()}-${pdfFile.name}`;
                const uploadDir = path.join(__dirname, '..', 'uploads', 'tests');
                const uploadPath = path.join(uploadDir, pdfName);
                await pdfFile.mv(uploadPath);
                pdfPath = `/uploads/tests/${pdfName}`;
            }
            if (req.files.answerSheet) {
                const sheetFile = req.files.answerSheet;
                const sheetName = `answers-${Date.now()}-${sheetFile.name}`;
                const uploadDir = path.join(__dirname, '..', 'uploads', 'tests');
                const uploadPath = path.join(uploadDir, sheetName);
                await sheetFile.mv(uploadPath);
                answerSheetPath = `/uploads/tests/${sheetName}`;
            }
        }

        const isLockedBool = String(isLocked) === 'true';
        const newTestObj = {
            title,
            subject,
            standard: Number(standard), // Ensure number
            price: Number(price || 0),
            isLocked: isLockedBool,
            pdfPath,
            answerSheetPath,
            questions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        try {
            if (mongoose.connection.readyState === 1) {
                const test = new Test(newTestObj);
                const createdTest = await test.save();
                return res.status(201).json(createdTest);
            } else {
                throw new Error('MongoDB not connected');
            }
        } catch (dbError) {
             console.warn('Database unavailable, saving to file:', dbError.message);
             const tests = getFileTests();
             const newTest = { ...newTestObj, _id: String(Date.now()) }; // Generate simple ID
             tests.push(newTest);
             saveFileTests(tests);
             return res.status(201).json(newTest);
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Submit test answers
// @route   POST /api/tests/:id/submit
// @access  Protected
const submitTest = async (req, res) => {
    const { answers } = req.body; 

    const findTest = async () => {
         if (mongoose.connection.readyState === 1) {
             return await Test.findById(req.params.id);
         }
         const tests = getFileTests();
         return tests.find(t => t._id === req.params.id);
    };

    const test = await findTest();

    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    // For PDF tests, there are no interactive questions to score automatically usually,
    // but if backward compatibility is kept:
    let score = 0;
    if (test.questions && test.questions.length > 0) {
        test.questions.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) {
                score++;
            }
        });
    }

    res.json({ score, total: (test.questions || []).length });
};

module.exports = { getTests, getTestById, createTest, submitTest };
