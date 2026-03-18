const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const mongoose = require('mongoose');
const User = require('../models/User');
const { isSupabaseEnabled, getSupabaseAdmin } = require('../config/supabase');
const { getAdminEmails } = require('../utils/adminEmailStore');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const isDbConnected = () => mongoose.connection.readyState === 1;

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

const buildDevAuthResponse = ({ name, email, role = 'student', picture }) => {
    const devUser = {
        _id: `dev-${email}`,
        name,
        email,
        role,
        standard: null,
        progress: buildProgress(),
        purchasedTests: []
    };

    return {
        ...devUser,
        token: generateToken({
            id: devUser._id,
            role: devUser.role,
            name: devUser.name,
            email: devUser.email,
            isDevMock: true
        }),
        picture
    };
};

const decodeJwtPayload = (token) => {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payloadJson = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(payloadJson);
};

const googleLogin = async (req, res) => {
    const { token } = req.body;

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
            name = payload.name;
            email = payload.email;
            googleId = payload.sub;
            picture = payload.picture;
        } catch (verifyError) {
            if (process.env.ALLOW_DEV_GOOGLE_BYPASS !== 'true') {
                throw verifyError;
            }

            const payload = decodeJwtPayload(token);
            if (!payload || !payload.email) {
                throw verifyError;
            }

            name = payload.name || payload.email.split('@')[0];
            email = payload.email;
            googleId = payload.sub || payload.email;
            picture = payload.picture;
            console.warn('Google token verification failed, using dev bypass. Disable ALLOW_DEV_GOOGLE_BYPASS in production.');
        }

        const resolvedRole = await getRoleForEmail(email);

        if (isSupabaseEnabled()) {
            try {
                const supabase = getSupabaseAdmin();
                const { data: existing, error: findError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();
                if (findError) throw findError;

                let user = existing;
                if (user) {
                    const { data: updated, error: updateError } = await supabase
                        .from('users')
                        .update({ google_id: googleId, name, role: resolvedRole })
                        .eq('id', user.id)
                        .select('*')
                        .single();
                    if (updateError) throw updateError;
                    user = updated;
                } else {
                    const { data: created, error: createError } = await supabase
                        .from('users')
                        .insert({
                            name,
                            email,
                            google_id: googleId,
                            role: resolvedRole,
                            progress: buildProgress(),
                            purchased_tests: []
                        })
                        .select('*')
                        .single();
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
                    token: generateToken({ id: user.id, role: user.role || 'student' }),
                    picture
                });
            } catch (supabaseError) {
                if (process.env.ALLOW_DEV_GOOGLE_BYPASS === 'true') {
                    console.warn('Supabase user write failed during Google login, using dev fallback.', supabaseError.message);
                    return res.json(buildDevAuthResponse({ name, email, picture, role: resolvedRole }));
                }
                throw supabaseError;
            }
        }

        if (!isDbConnected() && process.env.ALLOW_DEV_GOOGLE_BYPASS === 'true') {
            return res.json(buildDevAuthResponse({ name, email, picture, role: resolvedRole }));
        }

        let user = await User.findOne({ email });

        if (user) {
            user.googleId = googleId;
            user.role = resolvedRole;
            await user.save();
        } else {
            user = await User.create({
                name,
                email,
                googleId,
                role: resolvedRole
            });
        }

        return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            standard: user.standard,
            progress: user.progress,
            purchasedTests: user.purchasedTests,
            token: generateToken({ id: user._id, role: user.role }),
            picture
        });
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Google Auth Failed' });
    }
};

const getUserProfile = async (req, res) => {
    if (req.user?.isDevMock) {
        return res.json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            standard: null,
            progress: req.user.progress || buildProgress(),
            purchasedTests: req.user.purchasedTests || []
        });
    }

    if (isSupabaseEnabled()) {
        return res.json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            standard: req.user.standard,
            progress: req.user.progress || buildProgress(),
            purchasedTests: req.user.purchasedTests || []
        });
    }

    const user = await User.findById(req.user._id);
    if (user) {
        return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            standard: user.standard,
            progress: user.progress,
            purchasedTests: user.purchasedTests
        });
    }

    return res.status(404).json({ message: 'User not found' });
};

const updateUserProfile = async (req, res) => {
    if (req.user?.isDevMock) {
        return res.json({
            _id: req.user._id,
            name: req.body.name || req.user.name,
            email: req.user.email,
            role: req.user.role,
            standard: req.body.standard || null,
            token: generateToken({
                id: req.user._id,
                role: req.user.role,
                name: req.body.name || req.user.name,
                email: req.user.email,
                isDevMock: true
            }),
        });
    }

    if (isSupabaseEnabled()) {
        const supabase = getSupabaseAdmin();
        const { data: updated, error } = await supabase
            .from('users')
            .update({
                name: req.body.name || req.user.name,
                standard: req.body.standard || req.user.standard
            })
            .eq('id', req.user._id)
            .select('*')
            .single();

        if (error || !updated) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({
            _id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role || 'student',
            standard: updated.standard,
            token: generateToken({ id: updated.id, role: updated.role || 'student' }),
        });
    }

    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        if (req.body.standard) {
            user.standard = req.body.standard;
        }

        const updatedUser = await user.save();

        return res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            standard: updatedUser.standard,
            token: generateToken({ id: updatedUser._id, role: updatedUser.role }),
        });
    }

    return res.status(404).json({ message: 'User not found' });
};

const devLogin = async (req, res) => {
    if (process.env.ALLOW_DEV_GOOGLE_BYPASS !== 'true') {
        return res.status(403).json({ message: 'Dev login is disabled' });
    }

    const name = req.body.name || 'Demo Student';
    const email = req.body.email || 'demo.student@atoz.local';

    if (isSupabaseEnabled()) {
        try {
            const supabase = getSupabaseAdmin();
            const { data: existing, error: findError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            if (findError) throw findError;

            let user = existing;
            if (!user) {
                const { data: created, error: createError } = await supabase
                    .from('users')
                    .insert({
                        name,
                        email,
                        google_id: `dev-${Date.now()}`,
                        role: 'student',
                        progress: buildProgress(),
                        purchased_tests: []
                    })
                    .select('*')
                    .single();
                if (createError) throw createError;
                user = created;
            }

            return res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'student',
                standard: user.standard,
                token: generateToken({ id: user.id, role: user.role || 'student' })
            });
        } catch (supabaseError) {
            console.warn('Supabase dev login failed, using fallback token.', supabaseError.message);
            return res.json(buildDevAuthResponse({ name, email }));
        }
    }

    if (!isDbConnected()) {
        return res.json(buildDevAuthResponse({ name, email }));
    }

    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({
            name,
            email,
            googleId: `dev-${Date.now()}`,
            role: 'student'
        });
    }

    return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        standard: user.standard,
        token: generateToken({ id: user._id, role: user.role })
    });
};

module.exports = { googleLogin, getUserProfile, updateUserProfile, devLogin };
