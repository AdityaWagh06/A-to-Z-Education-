const jwt = require('jsonwebtoken');
const { getSupabaseAdmin } = require('../config/supabase');
const { sendGenericMessage } = require('../utils/errorResponse');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return sendGenericMessage(res, 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.id)
            .single();

        if (error || !data) {
            return sendGenericMessage(res, 401);
        }

        req.user = data;
        return next();
    } catch (error) {
        console.error(error);
        return sendGenericMessage(res, 401);
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return sendGenericMessage(res, 401);
    }
};

module.exports = { protect, admin };