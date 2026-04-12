const nodemailer = require('nodemailer');
const { getSupabaseAdmin } = require('../config/supabase');
const { getAdminEmails, writeStoredAdminEmails } = require('../utils/adminEmailStore');

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const createTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });
};

const escapeHtml = (text = '') => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getAdminEmailSettings = async (_req, res) => {
    try {
        const emails = await getAdminEmails();
        return res.json({ emails });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateAdminEmailSettings = async (req, res) => {
    const { emails } = req.body;
    if (!Array.isArray(emails)) {
        return res.status(400).json({ message: 'emails must be an array' });
    }
    try {
        const updated = await writeStoredAdminEmails(emails); // This writes to local JSON file
        return res.json({ emails: updated });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const sendBroadcastEmail = async (req, res) => {
    const { subject, message, ctaText, ctaLink } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ message: 'subject and message are required' });
    }

    const transporter = createTransporter();
    if (!transporter) {
        return res.status(503).json({
            message: 'Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.'
        });
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
        return res.status(503).json({ message: 'SMTP_FROM is required to send broadcast emails.' });
    }

    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('users')
            .select('email')
            .not('email', 'is', null);

        if (error) throw error;

        const recipients = [...new Set((data || [])
            .map((row) => normalizeEmail(row.email))
            .filter(Boolean))];

        if (recipients.length === 0) {
            return res.status(400).json({ message: 'No recipient emails found in users table.' });
        }

        const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
        const hasCta = ctaLink && ctaText;

        const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;">
                <h2 style="margin-bottom:12px;">${escapeHtml(subject)}</h2>
                <p style="margin:0 0 16px 0;">${safeMessage}</p>
                ${hasCta ? `<p style="margin:0 0 20px 0;"><a href="${escapeHtml(ctaLink)}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(ctaText)}</a></p>` : ''}
                <p style="font-size:12px;color:#6b7280;">You received this email because you signed in to A to Z Education.</p>
            </div>
        `;

        let sent = 0;
        const failed = [];

        for (const to of recipients) {
            try {
                await transporter.sendMail({
                    from,
                    to,
                    subject,
                    text: message,
                    html,
                    replyTo: process.env.SMTP_REPLY_TO || undefined
                });
                sent += 1;
            } catch (mailError) {
                failed.push({ email: to, error: mailError.message });
            }
        }

        return res.json({
            totalRecipients: recipients.length,
            sent,
            failedCount: failed.length,
            failed: failed.slice(0, 20)
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getStudentPurchases = async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const emailQuery = normalizeEmail(req.query?.email);

        const { data: tests, error: testsError } = await supabase
            .from('tests')
            .select('id, title, subject, standard, price, is_locked')
            .order('created_at', { ascending: false });

        if (testsError) throw testsError;

        if (emailQuery) {
            let user = null;

            const userPrimary = await supabase
                .from('users')
                .select('id, name, email, purchased_tests, purchased_standard_boxes')
                .eq('role', 'student')
                .ilike('email', emailQuery)
                .maybeSingle();

            if (userPrimary.error) {
                const details = `${userPrimary.error?.message || ''} ${userPrimary.error?.details || ''}`.toLowerCase();
                if (details.includes('purchased_standard_boxes') && details.includes('column')) {
                    const userFallback = await supabase
                        .from('users')
                        .select('id, name, email, purchased_tests')
                        .eq('role', 'student')
                        .ilike('email', emailQuery)
                        .maybeSingle();

                    if (userFallback.error) throw userFallback.error;
                    user = userFallback.data
                        ? { ...userFallback.data, purchased_standard_boxes: [] }
                        : null;
                } else {
                    throw userPrimary.error;
                }
            } else {
                user = userPrimary.data;
            }

            if (!user) {
                return res.status(404).json({ message: 'Student not found for this email.' });
            }

            const directPurchasedTests = [...new Set(user.purchased_tests || [])];
            const purchasedStandards = [...new Set((user.purchased_standard_boxes || []).map((value) => Number(value)))];
            const paidTestsByStandard = new Set(
                (tests || [])
                    .filter((test) => purchasedStandards.includes(Number(test.standard)) && (Boolean(test.is_locked) || Number(test.price || 0) > 0))
                    .map((test) => test.id)
            );
            const effectivePurchasedTests = [...new Set([...directPurchasedTests, ...paidTestsByStandard])];

            return res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    purchasedTests: directPurchasedTests,
                    purchasedStandardBoxes: purchasedStandards,
                    effectivePurchasedTests
                },
                tests: (tests || []).map((t) => ({
                    id: t.id,
                    title: t.title,
                    subject: t.subject,
                    standard: Number(t.standard || 0),
                    price: Number(t.price || 0),
                    isLocked: Boolean(t.is_locked)
                }))
            });
        }

        return res.json({
            users: [],
            tests: (tests || []).map((t) => ({
                id: t.id,
                title: t.title,
                subject: t.subject,
                standard: Number(t.standard || 0),
                price: Number(t.price || 0),
                isLocked: Boolean(t.is_locked)
            }))
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateStudentPurchases = async (req, res) => {
    const { userId } = req.params;
    const { purchasedTests } = req.body;

    if (!Array.isArray(purchasedTests)) {
        return res.status(400).json({ message: 'purchasedTests must be an array' });
    }

    try {
        const supabase = getSupabaseAdmin();
        const normalized = [...new Set(purchasedTests.filter((id) => typeof id === 'string' && id.trim()))];

        const { data, error } = await supabase
            .from('users')
            .update({ purchased_tests: normalized })
            .eq('id', userId)
            .eq('role', 'student')
            .select('id, name, email, purchased_tests')
            .single();

        if (error) throw error;

        return res.json({
            id: data.id,
            name: data.name,
            email: data.email,
            purchasedTests: data.purchased_tests || []
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getAdminOverviewStats = async (_req, res) => {
    try {
        const supabase = getSupabaseAdmin();

        const [
            studentsCountResult,
            videosCountResult,
            testsCountResult,
            paidTestsCountResult,
            freeTestsCountResult,
            purchasesCountResult,
            paymentsResult,
        ] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('videos').select('id', { count: 'exact', head: true }),
            supabase.from('tests').select('id', { count: 'exact', head: true }),
            supabase.from('tests').select('id', { count: 'exact', head: true }).gt('price', 0),
            supabase.from('tests').select('id', { count: 'exact', head: true }).eq('price', 0),
            supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
            supabase.from('payments').select('amount').eq('status', 'completed'),
        ]);

        const possibleErrors = [
            studentsCountResult.error,
            videosCountResult.error,
            testsCountResult.error,
            paidTestsCountResult.error,
            freeTestsCountResult.error,
            purchasesCountResult.error,
            paymentsResult.error,
        ].filter(Boolean);

        if (possibleErrors.length > 0) {
            throw possibleErrors[0];
        }

        const revenue = (paymentsResult.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

        return res.json({
            students: studentsCountResult.count || 0,
            videos: videosCountResult.count || 0,
            tests: testsCountResult.count || 0,
            paidTests: paidTestsCountResult.count || 0,
            freeTests: freeTestsCountResult.count || 0,
            completedPurchases: purchasesCountResult.count || 0,
            revenue,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAdminEmailSettings,
    updateAdminEmailSettings,
    sendBroadcastEmail,
    getStudentPurchases,
    updateStudentPurchases,
    getAdminOverviewStats,
};
