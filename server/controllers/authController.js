const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getSupabaseAdmin } = require('../config/supabase');
const { getAdminEmails } = require('../utils/adminEmailStore');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const buildProgress = () => ({
    maths: { lessonsCompleted: [], testsTaken: [] },
    english: { lessonsCompleted: [], testsTaken: [] },
    marathi: { lessonsCompleted: [], testsTaken: [] },
    intelligence: { lessonsCompleted: [], testsTaken: [] }
});

const getRoleForEmail = async (email) => {
    const adminEmails = await getAdminEmails();
    return adminEmails.includes((email || '').toLowerCase()) ? 'admin' : 'student';
};

const decodeJwtPayload = (token) => {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payloadJson = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(payloadJson);
};

const isMissingColumnError = (error, columnName) => {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return details.includes(`'${columnName.toLowerCase()}'`) && details.includes('column');
};

// @desc    Auth user & get token
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    const { token, name: providedName, mobile } = req.body;

    try {
        let name;
        let email;
        let googleId;
        let picture;

        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            // Use provided name if available, otherwise fallback to Google name
            name = providedName || payload.name;
            email = payload.email;
            googleId = payload.sub;
            picture = payload.picture;
        } catch (verifyError) {
            if (process.env.ALLOW_DEV_GOOGLE_BYPASS !== 'true') {
                throw verifyError;
            }

            const payload = decodeJwtPayload(token);
            if (!payload || !payload.email) {
                // If it's a dev token but email parsing fails, return fake data
                 return res.json({
                    _id: 'dev-user-id',
                    name: providedName || 'Dev User',
                    email: 'dev@example.com',
                    role: 'student',
                    standard: null,
                    progress: buildProgress(),
                    purchasedTests: [],
                    token: generateToken({ id: 'dev-user-id', role: 'student' }),
                    picture: '',
                    mobile_no: mobile || ''
                });
            }

            name = providedName || payload.name || payload.email.split('@')[0];
            email = payload.email;
            googleId = payload.sub || payload.email;
            picture = payload.picture;
            console.warn('Google token verification failed, using dev bypass.');
        }

        const resolvedRole = await getRoleForEmail(email);

        const supabase = getSupabaseAdmin();
        const { data: existing, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        
        if (findError) throw findError;

        let user = existing;
        if (user) {
            const updates = { google_id: googleId, role: resolvedRole, picture, last_login_at: new Date().toISOString() };
            if (name) updates.name = name;
            if (mobile) updates.mobile_no = mobile;

            let { data: updated, error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id)
                .select('*')
                .single();

            if (updateError && isMissingColumnError(updateError, 'last_login_at')) {
                const { last_login_at, ...fallbackUpdates } = updates;
                const fallback = await supabase
                    .from('users')
                    .update(fallbackUpdates)
                    .eq('id', user.id)
                    .select('*')
                    .single();
                updated = fallback.data;
                updateError = fallback.error;
            }

            if (updateError) throw updateError;
            user = updated;
        } else {
            const insertPayload = {
                name,
                email,
                google_id: googleId,
                role: resolvedRole,
                progress: buildProgress(),
                purchased_tests: [],
                picture,
                mobile_no: mobile,
                last_login_at: new Date().toISOString()
            };

            let { data: created, error: createError } = await supabase
                .from('users')
                .insert(insertPayload)
                .select('*')
                .single();

            if (createError && isMissingColumnError(createError, 'last_login_at')) {
                const { last_login_at, ...fallbackInsertPayload } = insertPayload;
                const fallback = await supabase
                    .from('users')
                    .insert(fallbackInsertPayload)
                    .select('*')
                    .single();
                created = fallback.data;
                createError = fallback.error;
            }

            if (createError) throw createError;
            user = created;
        }

        return res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'student',
            standard: user.standard,
            progress: user.progress || buildProgress(),
            purchasedTests: user.purchased_tests || [],
            purchasedStandardBoxes: user.purchased_standard_boxes || [],
            token: generateToken({ id: user.id, role: user.role || 'student' }),
            picture: picture || user.picture,
            mobile_no: user.mobile_no
        });

    } catch (error) {
        console.error('Auth Error Details:', error);
        res.status(401).json({ message: `Google Auth Failed: ${error.message || JSON.stringify(error)}` });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    if (req.user) {
        res.json({
            _id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role || 'student',
            standard: req.user.standard,
            progress: req.user.progress || buildProgress(),
            purchasedTests: req.user.purchased_tests || [],
            purchasedStandardBoxes: req.user.purchased_standard_boxes || [],
            picture: req.user.picture,
            mobile_no: req.user.mobile_no
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
        .from('users')
        .update({
            name: req.body.name || req.user.name,
            standard: req.body.standard || req.user.standard
        })
        .eq('id', req.user.id)
        .select('*')
        .single();

    if (error || !updated) {
        return res.status(404).json({ message: 'User update failed' });
    }

    res.json({
        _id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role || 'student',
        standard: updated.standard,
        token: generateToken({ id: updated.id, role: updated.role || 'student' }),
    });
};

module.exports = {
    googleLogin,
    getUserProfile,
    updateUserProfile
};