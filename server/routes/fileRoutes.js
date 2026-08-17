const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSupabaseAdmin } = require('../config/supabase');

router.get('/tests/:filename', protect, async (req, res) => {
    const supabase = getSupabaseAdmin();
    const relativePath = `/uploads/tests/${req.params.filename}`;

    const { data: test, error } = await supabase
        .from('tests')
        .select('id, standard, is_locked, pdf_path, answer_sheet_path')
        .or(`pdf_path.eq.${relativePath},answer_sheet_path.eq.${relativePath}`)
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

    const filePath = path.join(__dirname, '..', relativePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Not found' });
    return res.sendFile(filePath);
});

module.exports = router;
