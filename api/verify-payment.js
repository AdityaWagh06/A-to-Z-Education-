const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { setCors } = require('./_utils/cors');
const { checkRateLimit, applyRateLimitHeaders } = require('./_utils/rateLimiter');

const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
};

const VERIFY_PAYMENT_LIMIT = Math.min(10, Math.max(5, Number(process.env.VERIFY_PAYMENT_RATE_LIMIT || 10)));
const VERIFY_PAYMENT_WINDOW_MS = Math.max(30 * 1000, Number(process.env.VERIFY_PAYMENT_RATE_WINDOW_MS || 60 * 1000));

const isNoRowsError = (error) => {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return error?.code === 'PGRST116' || details.includes('0 rows') || details.includes('no rows');
};

const safeServerError = (res, code, message, error, meta = {}) => {
    console.error('[verify-payment]', {
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
        .select('id')
        .eq('id', decoded.id)
        .single();

    if (error || !user) {
        return { error: 'Unauthorized', status: 401 };
    }

    return { data: user };
};

const wasAlreadyCompletedAfterRace = async (supabase, userId, orderId, paymentId) => {
    const { data, error } = await supabase
        .from('payments')
        .select('status, razorpay_payment_id')
        .eq('razorpay_order_id', orderId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    if (data.status !== 'completed') {
        return false;
    }

    return !data.razorpay_payment_id || data.razorpay_payment_id === paymentId;
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
        scope: 'verify-payment',
        maxRequests: VERIFY_PAYMENT_LIMIT,
        windowMs: VERIFY_PAYMENT_WINDOW_MS,
    });
    applyRateLimitHeaders(res, rateLimit);

    if (!rateLimit.allowed) {
        return send(res, 429, { message: 'Too many requests. Please retry shortly.' });
    }

    try {
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return send(res, 503, { message: 'Payments are not configured yet.' });
        }

        const body = parseBody(req);
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            standard_value,
            payment_type,
        } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return send(res, 400, { message: 'Missing payment verification fields.' });
        }

        const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(signatureBody)
            .digest('hex');

        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
        const receivedBuffer = Buffer.from(String(razorpay_signature), 'utf8');
        const signatureValid = expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

        if (!signatureValid) {
            console.error('[verify-payment] invalid_signature', { orderId: razorpay_order_id, paymentId: razorpay_payment_id });
            return send(res, 400, { message: 'Invalid signature' });
        }

        const supabase = getSupabaseAdmin();
        const authResult = await getAuthUser(req, supabase);
        if (authResult.error) {
            return send(res, authResult.status, { message: authResult.error });
        }
        const user = authResult.data;

        const { data: existingPayment, error: paymentLookupError } = await supabase
            .from('payments')
            .select('*')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('user_id', user.id)
            .single();

        if (paymentLookupError) throw paymentLookupError;
        if (!existingPayment) {
            return send(res, 404, { message: 'Payment record not found.' });
        }

        if (existingPayment.status === 'completed') {
            return send(res, 200, { message: 'Payment already verified' });
        }

        const standardHint = Number(standard_value || existingPayment.standard_value || 0);
        const requestedType = payment_type === 'standard_box' ? 'standard_box' : null;
        const inferredStandardBox =
            existingPayment.payment_type === 'standard_box' ||
            Boolean(existingPayment.box_id) ||
            Number(existingPayment.standard_value || 0) > 0 ||
            (requestedType === 'standard_box' && standardHint > 0);
        const resolvedPaymentType = inferredStandardBox ? 'standard_box' : 'test';

        let expectedAmount = 0;

        if (resolvedPaymentType === 'standard_box') {
            let boxQuery = supabase
                .from('paid_standard_boxes')
                .select('amount, standard');

            if (existingPayment.box_id) {
                boxQuery = boxQuery.eq('id', existingPayment.box_id);
            } else if (standardHint) {
                boxQuery = boxQuery.eq('standard', standardHint);
            }

            const standardToValidate = Number(existingPayment.standard_value || standardHint || 0);
            if (!Number.isInteger(standardToValidate) || standardToValidate <= 0) {
                return send(res, 400, { message: 'Invalid standard for paid test unlock.' });
            }

            const { data: box, error: boxError } = await boxQuery.maybeSingle();
            if (boxError && !isMissingTableError(boxError, 'paid_standard_boxes')) {
                throw boxError;
            }

            const { data: paidTests, error: paidTestsError } = await supabase
                .from('tests')
                .select('id, price')
                .eq('standard', Number(standardToValidate))
                .eq('is_locked', true);

            if (paidTestsError) throw paidTestsError;

            const paidTestsInStandard = (paidTests || []).filter((test) => Number(test.price || 0) > 0);
            if (paidTestsInStandard.length <= 0) {
                return send(res, 400, { message: 'This paid box has no paid tests.' });
            }

            if (box) {
                if (standardToValidate !== Number(box.standard)) {
                    return send(res, 400, { message: 'Paid box standard mismatch.' });
                }
                expectedAmount = Number(box.amount || 0);
            } else {
                expectedAmount = Math.max(...paidTestsInStandard.map((test) => Number(test.price || 0)));
            }

            if (expectedAmount <= 0) {
                return send(res, 400, { message: 'This paid box has an invalid amount.' });
            }
        } else {
            const { data: test, error: testError } = await supabase
                .from('tests')
                .select('id, price, is_locked')
                .eq('id', existingPayment.test_id)
                .single();

            if (testError || !test) {
                return send(res, 400, { message: 'Linked test not found for payment.' });
            }

            expectedAmount = Number(test.price || 0);
            if (expectedAmount <= 0 || !test.is_locked) {
                return send(res, 400, { message: 'This test no longer requires payment.' });
            }
        }

        if (Number(existingPayment.amount || 0) !== expectedAmount) {
            return send(res, 400, { message: 'Payment amount mismatch.' });
        }

        const { data: payment, error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'completed',
                razorpay_payment_id,
            })
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .select('*')
            .single();

        if (updateError) {
            if (isNoRowsError(updateError)) {
                const duplicateCallback = await wasAlreadyCompletedAfterRace(
                    supabase,
                    user.id,
                    razorpay_order_id,
                    razorpay_payment_id
                );

                if (duplicateCallback) {
                    console.log('[verify-payment] duplicate_callback_acknowledged', {
                        userId: user.id,
                        orderId: razorpay_order_id,
                        paymentId: razorpay_payment_id,
                    });
                    return send(res, 200, { message: 'Payment already verified', duplicate: true });
                }
            }

            throw updateError;
        }
        if (!payment) {
            return send(res, 404, { message: 'Payment record not found.' });
        }

        // Grant access based on payment type.
        let dbUser = null;
        let hasPurchasedStandardBoxesColumn = true;

        const userPrimary = await supabase
            .from('users')
            .select('id, purchased_tests, purchased_standard_boxes')
            .eq('id', payment.user_id)
            .single();

        if (userPrimary.error && isMissingColumnError(userPrimary.error, 'purchased_standard_boxes')) {
            hasPurchasedStandardBoxesColumn = false;
            const userFallback = await supabase
                .from('users')
                .select('id, purchased_tests')
                .eq('id', payment.user_id)
                .single();

            if (userFallback.error) throw userFallback.error;
            dbUser = userFallback.data;
        } else {
            if (userPrimary.error) throw userPrimary.error;
            dbUser = userPrimary.data;
        }

        const purchasedTests = dbUser?.purchased_tests || [];
        const purchasedStandardBoxes = dbUser?.purchased_standard_boxes || [];

        const shouldGrantStandardBox =
            payment.payment_type === 'standard_box' ||
            Boolean(payment.box_id) ||
            Number(payment.standard_value || 0) > 0 ||
            (payment_type === 'standard_box' && standardHint > 0);

        if (shouldGrantStandardBox) {
            const standardValue = Number(payment.standard_value || standardHint);
            if (!Number.isInteger(standardValue) || standardValue <= 0) {
                return send(res, 400, { message: 'Invalid standard value for paid test unlock.' });
            }

            if (hasPurchasedStandardBoxesColumn) {
                if (!purchasedStandardBoxes.includes(standardValue)) {
                    purchasedStandardBoxes.push(standardValue);
                    const { error: updateUserError } = await supabase
                        .from('users')
                        .update({ purchased_standard_boxes: purchasedStandardBoxes })
                        .eq('id', payment.user_id);

                    if (updateUserError) throw updateUserError;
                }
            } else {
                const { data: standardPaidTests, error: standardPaidTestsError } = await supabase
                    .from('tests')
                    .select('id')
                    .eq('standard', standardValue)
                    .eq('is_locked', true);

                if (standardPaidTestsError) throw standardPaidTestsError;

                const mergedPurchasedTests = [
                    ...new Set([
                        ...purchasedTests,
                        ...(standardPaidTests || []).map((row) => row.id).filter(Boolean),
                    ]),
                ];

                const { error: updateUserError } = await supabase
                    .from('users')
                    .update({ purchased_tests: mergedPurchasedTests })
                    .eq('id', payment.user_id);

                if (updateUserError) throw updateUserError;
            }
        } else if (!purchasedTests.includes(payment.test_id)) {
            purchasedTests.push(payment.test_id);
            const { error: updateUserError } = await supabase
                .from('users')
                .update({ purchased_tests: purchasedTests })
                .eq('id', payment.user_id);

            if (updateUserError) throw updateUserError;
        }

        console.log('[verify-payment] verification_completed', {
            userId: user.id,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            paymentType: resolvedPaymentType,
            amount: payment.amount,
        });

        return send(res, 200, { message: 'Payment verified successfully' });
    } catch (error) {
        return safeServerError(res, 500, 'Something went wrong', error);
    }
};
