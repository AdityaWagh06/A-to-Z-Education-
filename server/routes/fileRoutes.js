const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSupabaseAdmin } = require('../config/supabase');

router.get('/tests/:filename', protect, async (req, res) => {
    let rawFilename = req.params.filename;
    try {
        rawFilename = decodeURIComponent(rawFilename);
    } catch {
        // Keep rawFilename if decoding fails
    }

    const safeFilename = path.basename(rawFilename);

    if (!safeFilename || safeFilename.includes('..')) {
        return res.status(400).json({ message: 'Invalid file parameter' });
    }

    const uploadBaseDir = path.resolve(path.join(__dirname, '../uploads/tests'));
    const filePath = path.resolve(path.join(uploadBaseDir, safeFilename));

    if (!filePath.startsWith(uploadBaseDir)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = getSupabaseAdmin();
    const relativePath = `/uploads/tests/${safeFilename}`;

    const { data: test, error } = await supabase
        .from('tests')
        .select('id, standard, is_locked, pdf_path, answer_sheet_path')
        .or(`pdf_path.eq.${relativePath},answer_sheet_path.eq.${relativePath},pdf_path.ilike.%${safeFilename}%,answer_sheet_path.ilike.%${safeFilename}%`)
        .maybeSingle();

    if (error || !test) return res.status(404).json({ message: 'Not found' });

    if (test.is_locked) {
        const { data: user } = await supabase
            .from('users')
            .select('role, purchased_tests, purchased_standard_boxes')
            .eq('id', req.user.id)
            .single();

        const purchased =
            user?.role === 'admin' ||
            (user?.purchased_tests || []).includes(test.id) ||
            (user?.purchased_standard_boxes || []).includes(Number(test.standard));

        if (!purchased) return res.status(403).json({ message: 'Not purchased' });
    }

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Not found' });
    return res.sendFile(filePath);
});

module.exports = router;
