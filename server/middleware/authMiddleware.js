const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isSupabaseEnabled, getSupabaseAdmin } = require('../config/supabase');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.isDevMock) {
                req.user = {
                    _id: decoded.id,
                    name: decoded.name,
                    email: decoded.email,
                    role: decoded.role,
                    isDevMock: true,
                    progress: {
                        maths: { lessonsCompleted: [], testsTaken: [] },
                        english: { lessonsCompleted: [], testsTaken: [] },
                        marathi: { lessonsCompleted: [], testsTaken: [] },
                        intelligence: { lessonsCompleted: [], testsTaken: [] }
                    },
                    purchasedTests: []
                };
                return next();
            }

            if (isSupabaseEnabled()) {
                const supabase = getSupabaseAdmin();
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', decoded.id)
                    .single();

                if (error || !data) {
                    return res.status(401).json({ message: 'Not authorized, user not found' });
                }

                req.user = {
                    _id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role || 'student',
                    standard: data.standard,
                    progress: data.progress || {},
                    purchasedTests: data.purchased_tests || []
                };
                return next();
            }

            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            return next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
