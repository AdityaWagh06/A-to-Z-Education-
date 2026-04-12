const crypto = require('crypto');

const store = global.__AZ_RATE_LIMIT_STORE__ || new Map();
global.__AZ_RATE_LIMIT_STORE__ = store;

const now = () => Date.now();

const normalizeIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];

    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }

    if (typeof realIp === 'string' && realIp.trim()) {
        return realIp.trim();
    }

    return req.socket?.remoteAddress || 'unknown';
};

const hashToken = (token) => {
    if (!token) return 'anonymous';
    return crypto.createHash('sha1').update(token).digest('hex').slice(0, 16);
};

const buildIdentity = (req, userId) => {
    if (userId) {
        return `user:${userId}`;
    }

    const auth = req.headers.authorization || req.headers.Authorization || '';
    return `token:${hashToken(auth)}`;
};

const buildKey = (scope, ip, identity) => `${scope}|${ip}|${identity}`;

const cleanupExpired = (timestamp) => {
    for (const [key, value] of store.entries()) {
        if (value.resetAt <= timestamp) {
            store.delete(key);
        }
    }
};

const checkRateLimit = (req, options = {}) => {
    const scope = options.scope || 'default';
    const maxRequests = Number(options.maxRequests || 10);
    const windowMs = Number(options.windowMs || 60 * 1000);
    const userId = options.userId || null;

    const ip = normalizeIp(req);
    const identity = buildIdentity(req, userId);
    const key = buildKey(scope, ip, identity);

    const timestamp = now();
    cleanupExpired(timestamp);

    let entry = store.get(key);
    if (!entry || entry.resetAt <= timestamp) {
        entry = { count: 0, resetAt: timestamp + windowMs };
        store.set(key, entry);
    }

    entry.count += 1;

    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - timestamp) / 1000));
    const remaining = Math.max(0, maxRequests - entry.count);

    return {
        allowed: entry.count <= maxRequests,
        retryAfterSeconds,
        remaining,
        limit: maxRequests,
        resetAt: entry.resetAt,
        key,
    };
};

const applyRateLimitHeaders = (res, result) => {
    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
    }
};

module.exports = {
    checkRateLimit,
    applyRateLimitHeaders,
};
