const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { setCors } = require('./_utils/cors');
const { checkRateLimit, applyRateLimitHeaders } = require('./_utils/rateLimiter');

const WEBHOOK_LIMIT = Math.min(60, Math.max(10, Number(process.env.RAZORPAY_WEBHOOK_RATE_LIMIT || 30)));
const WEBHOOK_WINDOW_MS = Math.max(30 * 1000, Number(process.env.RAZORPAY_WEBHOOK_RATE_WINDOW_MS || 60 * 1000));

const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
};

const safeServerError = (res, code, message, error, meta = {}) => {
    console.error('[razorpay-webhook]', {
        code,
        meta,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
    });
    return send(res, code, { message });
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

const readRawBody = async (req) => {
    if (typeof req.body === 'string') return req.body;
    if (req.rawBody) {
        if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
        if (typeof req.rawBody === 'string') return req.rawBody;
    }
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');

    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length > 0) {
        return Buffer.concat(chunks).toString('utf8');
    }

    if (req.body && typeof req.body === 'object') {
        return JSON.stringify(req.body);
    }

    return '';
};

const verifySignature = (rawBody, signature, secret) => {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(String(signature || ''), 'utf8');

    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const markPaymentCompleted = async (supabase, orderId, paymentId, amountRupees) => {
    const { data: payment, error: lookupError } = await supabase
        .from('payments')
        .select('id, status, razorpay_order_id, razorpay_payment_id, amount')
        .eq('razorpay_order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lookupError) throw lookupError;
    if (!payment) return { updated: false, missing: true };

    if (payment.status === 'completed') {
        return { updated: false, duplicate: true, paymentId: payment.id };
    }

    const { error: updateError } = await supabase
        .from('payments')
        .update({
            status: 'completed',
            razorpay_payment_id: paymentId || payment.razorpay_payment_id,
            amount: Number.isFinite(amountRupees) && amountRupees > 0 ? amountRupees : payment.amount,
        })
        .eq('id', payment.id)
        .eq('status', 'pending');

    if (updateError) throw updateError;

    return { updated: true, paymentId: payment.id };
};

const markPaymentFailed = async (supabase, orderId, paymentId) => {
    const { data: payment, error: lookupError } = await supabase
        .from('payments')
        .select('id, status, razorpay_payment_id')
        .eq('razorpay_order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lookupError) throw lookupError;
    if (!payment) return { updated: false, missing: true };

    if (payment.status === 'failed') {
        return { updated: false, duplicate: true, paymentId: payment.id };
    }

    if (payment.status === 'completed') {
        return { updated: false, alreadyCompleted: true, paymentId: payment.id };
    }

    const { error: updateError } = await supabase
        .from('payments')
        .update({
            status: 'failed',
            razorpay_payment_id: paymentId || payment.razorpay_payment_id,
        })
        .eq('id', payment.id)
        .eq('status', 'pending');

    if (updateError) throw updateError;

    return { updated: true, paymentId: payment.id };
};

module.exports = async (req, res) => {
    const cors = setCors(req, res, {
        allowedHeaders: 'Content-Type,X-Razorpay-Signature',
    });
    if (cors.ended) return;
    if (!cors.ok) {
        return send(res, cors.status || 403, { message: 'Something went wrong' });
    }

    if (req.method !== 'POST') {
        return send(res, 405, { message: 'Method not allowed' });
    }

    const rateLimit = checkRateLimit(req, {
        scope: 'razorpay-webhook',
        maxRequests: WEBHOOK_LIMIT,
        windowMs: WEBHOOK_WINDOW_MS,
        userId: 'webhook',
    });
    applyRateLimitHeaders(res, rateLimit);

    if (!rateLimit.allowed) {
        return send(res, 429, { message: 'Too many requests. Please retry shortly.' });
    }

    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return send(res, 503, { message: 'Payments are not configured yet.' });
        }

        const signature = req.headers['x-razorpay-signature'];
        const rawBody = await readRawBody(req);

        if (!signature || !rawBody) {
            return send(res, 400, { message: 'Invalid webhook payload' });
        }

        if (!verifySignature(rawBody, signature, webhookSecret)) {
            console.error('[razorpay-webhook] invalid_signature');
            return send(res, 400, { message: 'Invalid webhook signature' });
        }

        let payload = null;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return send(res, 400, { message: 'Invalid webhook payload' });
        }

        const event = payload?.event;
        const entity = payload?.payload?.payment?.entity || {};
        const orderId = entity.order_id;
        const paymentId = entity.id;
        const amountRupees = Number(entity.amount || 0) / 100;

        if (!orderId) {
            return send(res, 400, { message: 'Invalid webhook payload' });
        }

        const supabase = getSupabaseAdmin();

        if (event === 'payment.captured') {
            const result = await markPaymentCompleted(supabase, orderId, paymentId, amountRupees);
            console.log('[razorpay-webhook] payment_captured_processed', {
                orderId,
                paymentId,
                result,
            });
            return send(res, 200, { ok: true });
        }

        if (event === 'payment.failed') {
            const result = await markPaymentFailed(supabase, orderId, paymentId);
            console.log('[razorpay-webhook] payment_failed_processed', {
                orderId,
                paymentId,
                result,
            });
            return send(res, 200, { ok: true });
        }

        console.log('[razorpay-webhook] ignored_event', { event, orderId, paymentId });
        return send(res, 200, { ok: true, ignored: true });
    } catch (error) {
        return safeServerError(res, 500, 'Something went wrong', error);
    }
};
