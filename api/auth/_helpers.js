const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { setCors } = require('../_utils/cors');

const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
};

const parseBody = (req) => {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }
    }
    return req.body;
};

const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase configuration');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
};

const buildProgress = () => ({
    maths: { lessonsCompleted: [], testsTaken: [] },
    english: { lessonsCompleted: [], testsTaken: [] },
    marathi: { lessonsCompleted: [], testsTaken: [] },
    intelligence: { lessonsCompleted: [], testsTaken: [] },
});

const decodeJwtPayload = (token) => {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payloadJson = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(payloadJson);
};

const verifyGoogleToken = async (idToken) => {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
        throw new Error('Invalid Google token');
    }

    const payload = await response.json();
    const aud = payload.aud;
    const expected = process.env.GOOGLE_CLIENT_ID;
    if (expected && aud !== expected) {
        throw new Error('Google token audience mismatch');
    }

    return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
    };
};

const isMissingColumnError = (error, columnName) => {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return details.includes(`'${String(columnName || '').toLowerCase()}'`) && details.includes('column');
};

const getMissingColumnFromError = (error, candidates = []) => {
    for (const column of candidates) {
        if (isMissingColumnError(error, column)) return column;
    }
    return null;
};

const readAdminEmailsFromFile = () => {
    try {
        const filePath = path.join(process.cwd(), 'server', 'data', 'admin-emails.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
        }
    } catch {
        // ignore
    }
    return [];
};

const getAdminEmails = () => {
    const envEmails = String(process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    const fileEmails = readAdminEmailsFromFile();
    return [...new Set([...envEmails, ...fileEmails])];
};

const getRoleForEmail = (email) => {
    const admins = getAdminEmails();
    return admins.includes(String(email || '').toLowerCase()) ? 'admin' : 'student';
};

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const getAuthUser = async (req, supabase) => {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return { error: 'Not authorized, no token', status: 401 };
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.id)
            .single();

        if (error || !data) {
            return { error: 'Not authorized, user not found', status: 401 };
        }

        return { data };
    } catch {
        return { error: 'Not authorized, token failed', status: 401 };
    }
};

const applyCorsOrFail = (req, res) => {
    const cors = setCors(req, res, {
        allowedMethods: 'GET,PUT,POST,DELETE,OPTIONS',
    });

    if (cors.ended) return { blocked: true };
    if (!cors.ok) {
        send(res, cors.status || 403, { message: 'Something went wrong' });
        return { blocked: true };
    }

    return { blocked: false };
};

module.exports = {
    applyCorsOrFail,
    buildProgress,
    decodeJwtPayload,
    generateToken,
    getAuthUser,
    getMissingColumnFromError,
    getRoleForEmail,
    getSupabaseAdmin,
    parseBody,
    send,
    verifyGoogleToken,
};
