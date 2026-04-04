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

module.exports = {
    getAdminEmailSettings,
    updateAdminEmailSettings,
    sendBroadcastEmail,
};
