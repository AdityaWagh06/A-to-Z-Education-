const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { setCors } = require('./_utils/cors');
const { checkRateLimit, applyRateLimitHeaders } = require('./_utils/rateLimiter');

const ORDER_IDEMPOTENCY_WINDOW_MS = Math.max(60 * 1000, Number(process.env.ORDER_IDEMPOTENCY_WINDOW_MS || 15 * 60 * 1000));

const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
};

const CREATE_ORDER_LIMIT = Math.min(10, Math.max(5, Number(process.env.CREATE_ORDER_RATE_LIMIT || 8)));
const CREATE_ORDER_WINDOW_MS = Math.max(30 * 1000, Number(process.env.CREATE_ORDER_RATE_WINDOW_MS || 60 * 1000));

const safeServerError = (res, code, message, error, meta = {}) => {
    console.error('[create-order]', {
        code,
        meta,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
    });
    return send(res, code, { message });
};

const isMissingColumnError = (error, columnName) => {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return details.includes('column') && details.includes(String(columnName || '').toLowerCase());
};

const isMissingTableError = (error, tableName) => {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    const target = String(tableName || '').toLowerCase();
    return (
        (details.includes('could not find the table') && details.includes(target)) ||
        (details.includes('relation') && details.includes(target) && details.includes('does not exist'))
    );
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

const getRazorpayClient = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null;
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

const getAuthUser = async (req, supabase) => {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return { error: 'Unauthorized', status: 401 };
    }

    const token = header.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return { error: 'Unauthorized', status: 401 };
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('id, role, purchased_tests, purchased_standard_boxes')
        .eq('id', decoded.id)
        .single();

    if (error && isMissingColumnError(error, 'purchased_standard_boxes')) {
        const fallback = await supabase
            .from('users')
            .select('id, role, purchased_tests')
            .eq('id', decoded.id)
            .single();

        if (fallback.error || !fallback.data) {
            return { error: 'Unauthorized', status: 401 };
        }

        return {
            data: {
                ...fallback.data,
                purchased_standard_boxes: [],
            },
        };
    }

    if (error || !user) {
        return { error: 'Unauthorized', status: 401 };
    }

    return { data: user };
};

const isRecent = (isoDate) => {
    if (!isoDate) return false;
    const ts = Date.parse(isoDate);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts <= ORDER_IDEMPOTENCY_WINDOW_MS;
};

const getExistingOrderResponse = async (razorpay, pendingPayment) => {
    if (!pendingPayment?.razorpay_order_id) return null;

    try {
        const existingOrder = await razorpay.orders.fetch(pendingPayment.razorpay_order_id);
        if (!existingOrder?.id) return null;

        return {
            id: existingOrder.id,
            order_id: existingOrder.id,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            reused: true,
        };
    } catch (error) {
        console.error('[create-order] existing_order_fetch_failed', {
            orderId: pendingPayment.razorpay_order_id,
            reason: error?.message,
        });
        return null;
    }
};

module.exports = async (req, res) => {
    const cors = setCors(req, res);
    if (cors.ended) return;
    if (!cors.ok) {
        return send(res, cors.status || 403, { message: 'Something went wrong' });
    }

    if (req.method !== 'POST') {
        return send(res, 405, { message: 'Method not allowed' });
    }

    const rateLimit = checkRateLimit(req, {
        scope: 'create-order',
        maxRequests: CREATE_ORDER_LIMIT,
        windowMs: CREATE_ORDER_WINDOW_MS,
    });
    applyRateLimitHeaders(res, rateLimit);

    if (!rateLimit.allowed) {
        return send(res, 429, { message: 'Too many requests. Please retry shortly.' });
    }

    try {
        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return send(res, 503, { message: 'Payments are not configured yet.' });
        }

        const supabase = getSupabaseAdmin();
        const authResult = await getAuthUser(req, supabase);
        if (authResult.error) {
            return send(res, authResult.status, { message: authResult.error });
        }
        const user = authResult.data;

        const body = parseBody(req);
        const paymentType = body.payment_type === 'standard_box' || body.standard ? 'standard_box' : 'test';

        if (paymentType === 'test') {
            const testId = body.testId;
            if (!testId || typeof testId !== 'string') {
                return send(res, 400, { message: 'Valid testId is required.' });
            }

            const { data: test, error: testError } = await supabase
                .from('tests')
                .select('id, price, is_locked')
                .eq('id', testId)
                .single();

            if (testError || !test) {
                return send(res, 404, { message: 'Test not found.' });
            }

            const finalAmount = Number(test.price || 0);
            if (finalAmount <= 0 || !test.is_locked) {
                return send(res, 400, { message: 'This test does not require payment.' });
            }

            if ((user.purchased_tests || []).includes(testId)) {
                return send(res, 409, { message: 'Test already purchased.' });
            }

            const { data: pendingPayment, error: pendingError } = await supabase
                .from('payments')
                .select('id, razorpay_order_id, created_at')
                .eq('user_id', user.id)
                .eq('test_id', testId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (pendingError) throw pendingError;

            if (pendingPayment && isRecent(pendingPayment.created_at)) {
                const reusedOrder = await getExistingOrderResponse(razorpay, pendingPayment);
                if (reusedOrder) {
                    console.log('[create-order] reused_pending_test_order', {
                        userId: user.id,
                        testId,
                        orderId: reusedOrder.id,
                    });
                    return send(res, 200, reusedOrder);
                }
            }

            const order = await razorpay.orders.create({
                amount: Math.round(finalAmount * 100),
                currency: 'INR',
                receipt: `receipt_order_${Date.now()}`,
            });

            const { error: insertError } = await supabase
                .from('payments')
                .insert([{ 
                    user_id: user.id,
                    test_id: testId,
                    razorpay_order_id: order.id,
                    amount: finalAmount,
                    status: 'pending',
                }]);

            if (insertError) throw insertError;

            console.log('[create-order] order_created', { userId: user.id, orderId: order.id, testId, amount: finalAmount });
            return send(res, 200, {
                id: order.id,
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
            });
        }

        const standardNumber = Number(body.standard);
        if (!Number.isInteger(standardNumber) || standardNumber < 2 || standardNumber > 10) {
            return send(res, 400, { message: 'Standard must be between 2 and 10.' });
        }

        const { data: paidTests, error: paidTestsError } = await supabase
            .from('tests')
            .select('id, price')
            .eq('standard', standardNumber)
            .eq('is_locked', true);

        if (paidTestsError) throw paidTestsError;

        const paidTestsInStandard = (paidTests || []).filter((test) => Number(test.price || 0) > 0);
        if (paidTestsInStandard.length <= 0) {
            return send(res, 400, { message: 'No paid tests are available for this standard yet.' });
        }

        if ((user.purchased_standard_boxes || []).includes(standardNumber)) {
            return send(res, 409, { message: 'This standard box is already unlocked.' });
        }

        const { data: box, error: boxError } = await supabase
            .from('paid_standard_boxes')
            .select('id, standard, amount, is_active')
            .eq('standard', standardNumber)
            .maybeSingle();

        if (boxError && !isMissingTableError(boxError, 'paid_standard_boxes')) {
            throw boxError;
        }

        if (box && !box.is_active) {
            return send(res, 400, { message: 'This paid box is currently inactive.' });
        }

        const derivedAmount = Math.max(...paidTestsInStandard.map((test) => Number(test.price || 0)));
        const amount = box ? Number(box.amount || 0) : Number(derivedAmount || 0);
        if (amount <= 0) {
            return send(res, 400, { message: 'Invalid box amount configured.' });
        }

        let pendingStandardPayment = null;
        const standardPendingQuery = await supabase
            .from('payments')
            .select('id, razorpay_order_id, created_at')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .eq('payment_type', 'standard_box')
            .eq('standard_value', standardNumber)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (standardPendingQuery.error && (isMissingColumnError(standardPendingQuery.error, 'payment_type') || isMissingColumnError(standardPendingQuery.error, 'standard_value'))) {
            const fallbackQuery = await supabase
                .from('payments')
                .select('id, razorpay_order_id, created_at')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .in('test_id', paidTestsInStandard.map((row) => row.id).filter(Boolean))
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fallbackQuery.error) throw fallbackQuery.error;
            pendingStandardPayment = fallbackQuery.data;
        } else {
            if (standardPendingQuery.error) throw standardPendingQuery.error;
            pendingStandardPayment = standardPendingQuery.data;
        }

        if (pendingStandardPayment && isRecent(pendingStandardPayment.created_at)) {
            const reusedOrder = await getExistingOrderResponse(razorpay, pendingStandardPayment);
            if (reusedOrder) {
                console.log('[create-order] reused_pending_standard_order', {
                    userId: user.id,
                    standard: standardNumber,
                    orderId: reusedOrder.id,
                });
                return send(res, 200, reusedOrder);
            }
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `std_box_${standardNumber}_${Date.now()}`,
        });

        let { error: insertError } = await supabase.from('payments').insert([{
            user_id: user.id,
            test_id: null,
            payment_type: 'standard_box',
            standard_value: standardNumber,
            box_id: box?.id || null,
            razorpay_order_id: order.id,
            amount,
            status: 'pending',
        }]);

        // Backward compatibility for older schema.
        if (
            insertError && (
                isMissingColumnError(insertError, 'payment_type') ||
                isMissingColumnError(insertError, 'standard_value') ||
                isMissingColumnError(insertError, 'box_id') ||
                `${insertError?.message || ''} ${insertError?.details || ''}`.toLowerCase().includes('test_id')
            )
        ) {
            const fallbackTestId = paidTestsInStandard[0]?.id;
            if (!fallbackTestId) {
                return send(res, 500, { message: 'Payment setup failed.' });
            }

            const fallbackInsert = await supabase.from('payments').insert([{
                user_id: user.id,
                test_id: fallbackTestId,
                razorpay_order_id: order.id,
                amount,
                status: 'pending',
            }]);

            insertError = fallbackInsert.error;
        }

        if (insertError) throw insertError;

        console.log('[create-order] standard_box_order_created', {
            userId: user.id,
            orderId: order.id,
            standard: standardNumber,
            amount,
        });

        return send(res, 200, {
            id: order.id,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        return safeServerError(res, 500, 'Something went wrong', error);
    }
};
