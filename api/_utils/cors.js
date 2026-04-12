const DEFAULT_ALLOWED_METHODS = 'POST,OPTIONS';
const DEFAULT_ALLOWED_HEADERS = 'Content-Type,Authorization,X-Razorpay-Signature';

const parseAllowedOrigins = () => {
    const raw = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '';
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const setCors = (req, res, options = {}) => {
    const allowedMethods = options.allowedMethods || DEFAULT_ALLOWED_METHODS;
    const allowedHeaders = options.allowedHeaders || DEFAULT_ALLOWED_HEADERS;
    const origin = req.headers.origin || req.headers.Origin;
    const allowedOrigins = parseAllowedOrigins();

    const hasOrigin = Boolean(origin);
    const hasConfiguredOrigins = allowedOrigins.length > 0;
    const isAllowedOrigin = hasOrigin && hasConfiguredOrigins && allowedOrigins.includes(origin);

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders);

    if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    if (req.method === 'OPTIONS') {
        if (!isAllowedOrigin) {
            res.statusCode = 403;
            res.end();
            return { ok: false, ended: true };
        }

        res.statusCode = 204;
        res.end();
        return { ok: true, ended: true };
    }

    if (hasOrigin && !isAllowedOrigin) {
        return { ok: false, ended: false, status: 403, message: 'CORS origin denied' };
    }

    return { ok: true, ended: false };
};

module.exports = {
    setCors,
};
