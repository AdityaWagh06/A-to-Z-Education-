const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getSupabaseAdmin } = require('../config/supabase');

const PAYMENT_VERIFY_RETRY_ATTEMPTS = Math.max(1, Number(process.env.PAYMENT_VERIFY_RETRY_ATTEMPTS || 3));
const PAYMENT_VERIFY_RETRY_DELAY_MS = Math.max(0, Number(process.env.PAYMENT_VERIFY_RETRY_DELAY_MS || 400));

class PaymentError extends Error {
    constructor(statusCode, clientMessage, internalMessage) {
        super(internalMessage || clientMessage);
        this.statusCode = statusCode;
        this.clientMessage = clientMessage;
    }
}

const logPayment = (level, event, meta = {}) => {
    const payload = {
        event,
        ts: new Date().toISOString(),
        ...meta,
    };

    if (level === 'error') {
        console.error('[payments]', payload);
    } else {
        console.log('[payments]', payload);
    }
};

const sendSafeError = (res, err, fallbackMessage = 'Payment processing failed. Please try again.') => {
    if (err instanceof PaymentError) {
        return res.status(err.statusCode).json({ message: err.clientMessage });
    }

    logPayment('error', 'unexpected_error', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        stack: err?.stack,
    });

    return res.status(500).json({ message: fallbackMessage });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (err) => {
    if (!err) return false;
    if (err instanceof PaymentError) return false;
    const msg = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
    return (
        msg.includes('timeout') ||
        msg.includes('timed out') ||
        msg.includes('network') ||
        msg.includes('connection') ||
        msg.includes('socket') ||
        msg.includes('temporarily')
    );
};

const withRetries = async (task, attempts, delayMs, contextMeta = {}) => {
    let attempt = 0;
    while (attempt < attempts) {
        try {
            return await task();
        } catch (err) {
            attempt += 1;
            const shouldRetry = isRetryableError(err) && attempt < attempts;
            logPayment(shouldRetry ? 'info' : 'error', 'verification_attempt_failed', {
                ...contextMeta,
                attempt,
                attempts,
                retrying: shouldRetry,
                reason: err?.message,
            });

            if (!shouldRetry) {
                throw err;
            }
            await sleep(delayMs * attempt);
        }
    }
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

const getRazorpayClient = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null;
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

const getPaymentConfig = (_req, res) => {
    if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(503).json({ message: 'Razorpay is not configured yet.' });
    }

    return res.json({ keyId: process.env.RAZORPAY_KEY_ID });
};

const validateAndMatchSignature = ({ orderId, paymentId, signature }) => {
    if (!process.env.RAZORPAY_KEY_SECRET) {
        throw new PaymentError(503, 'Payments are not configured yet. Please add Razorpay keys.');
    }

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(String(signature), 'utf8');

    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const grantAccessAfterPayment = async ({ supabase, payment, standardHint, paymentTypeHint }) => {
    let user = null;
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
        user = userFallback.data;
    } else {
        if (userPrimary.error) throw userPrimary.error;
        user = userPrimary.data;
    }

    const purchasedTests = user?.purchased_tests || [];
    const purchasedStandardBoxes = user?.purchased_standard_boxes || [];

    const paymentStandardHint = Number(standardHint || payment.standard_value || 0);
    const shouldGrantStandardBox =
        payment.payment_type === 'standard_box' ||
        Boolean(payment.box_id) ||
        Number(payment.standard_value || 0) > 0 ||
        (paymentTypeHint === 'standard_box' && paymentStandardHint > 0);

    if (shouldGrantStandardBox) {
        const standardValue = Number(payment.standard_value || standardHint || 0);
        if (!Number.isInteger(standardValue) || standardValue <= 0) {
            throw new PaymentError(400, 'Invalid standard value for paid test unlock.');
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
};

const finalizeVerification = async ({
    supabase,
    orderId,
    paymentId,
    scopedUserId,
    standardValue,
    paymentType,
}) => {
    let paymentQuery = supabase
        .from('payments')
        .select('*')
        .eq('razorpay_order_id', orderId);

    if (scopedUserId) {
        paymentQuery = paymentQuery.eq('user_id', scopedUserId);
    }

    const { data: existingPayment, error: paymentLookupError } = await paymentQuery.single();
    if (paymentLookupError) throw paymentLookupError;
    if (!existingPayment) throw new PaymentError(404, 'Payment record not found.');

    if (existingPayment.status === 'completed') {
        return { alreadyVerified: true, payment: existingPayment };
    }

    const standardHint = Number(standardValue || existingPayment.standard_value || 0);
    const requestedType = paymentType === 'standard_box' ? 'standard_box' : null;
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
            throw new PaymentError(400, 'Invalid standard for paid test unlock.');
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
            throw new PaymentError(400, 'This paid box has no paid tests.');
        }

        if (box) {
            if (standardToValidate !== Number(box.standard)) {
                throw new PaymentError(400, 'Paid box standard mismatch.');
            }
            expectedAmount = Number(box.amount || 0);
        } else {
            expectedAmount = Math.max(...paidTestsInStandard.map((test) => Number(test.price || 0)));
        }

        if (expectedAmount <= 0) {
            throw new PaymentError(400, 'This paid box has an invalid amount.');
        }
    } else {
        const { data: test, error: testError } = await supabase
            .from('tests')
            .select('id, price, is_locked')
            .eq('id', existingPayment.test_id)
            .single();

        if (testError || !test) {
            throw new PaymentError(400, 'Linked test not found for payment.');
        }

        expectedAmount = Number(test.price || 0);
        if (expectedAmount <= 0 || !test.is_locked) {
            throw new PaymentError(400, 'This test no longer requires payment.');
        }
    }

    if (Number(existingPayment.amount || 0) !== expectedAmount) {
        throw new PaymentError(400, 'Payment amount mismatch.');
    }

    const { data: payment, error: updateError } = await supabase
        .from('payments')
        .update({
            status: 'completed',
            razorpay_payment_id: paymentId,
        })
        .eq('razorpay_order_id', orderId)
        .eq('status', 'pending')
        .select('*')
        .single();

    if (updateError) throw updateError;
    if (!payment) throw new PaymentError(404, 'Payment record not found.');

    await grantAccessAfterPayment({
        supabase,
        payment,
        standardHint,
        paymentTypeHint: paymentType,
    });

    return { alreadyVerified: false, payment };
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Protected
const createOrder = async (req, res) => {
    const { testId } = req.body;
    const razorpay = getRazorpayClient();

    if (!testId || typeof testId !== 'string') {
        return res.status(400).json({ message: 'Valid testId is required.' });
    }

    if (!razorpay) {
        return res.status(503).json({ message: 'Payments are not configured yet. Please add Razorpay keys.' });
    }

    try {
        const supabase = getSupabaseAdmin();
        const { data: test, error: testError } = await supabase
            .from('tests')
            .select('id, price, is_locked')
            .eq('id', testId)
            .single();

        if (testError || !test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const finalAmount = Number(test.price || 0);
        if (finalAmount <= 0 || !test.is_locked) {
            return res.status(400).json({ message: 'This test does not require payment.' });
        }

        const { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('purchased_tests')
            .eq('id', req.user.id)
            .single();

        if (existingUserError) throw existingUserError;

        if ((existingUser?.purchased_tests || []).includes(testId)) {
            return res.status(409).json({ message: 'Test already purchased.' });
        }

        const options = {
            amount: Math.round(finalAmount * 100), // amount in smallest currency unit
            currency: 'INR',
            receipt: `receipt_order_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        const { error } = await supabase.from('payments').insert([{
            user_id: req.user.id,
            test_id: testId,
            razorpay_order_id: order.id,
            amount: finalAmount,
            status: 'pending'
        }]);

        if (error) throw error;
        logPayment('info', 'order_created', {
            userId: req.user.id,
            orderId: order.id,
            testId,
            amount: finalAmount,
        });
        res.json(order);
    } catch (error) {
        logPayment('error', 'order_create_failed', {
            userId: req.user?.id,
            testId,
            reason: error?.message,
        });
        return sendSafeError(res, error, 'Unable to create payment order. Please try again.');
    }
};

const createStandardBoxOrder = async (req, res) => {
    const { standard } = req.body;
    const razorpay = getRazorpayClient();

    if (!razorpay) {
        return res.status(503).json({ message: 'Payments are not configured yet. Please add Razorpay keys.' });
    }

    const standardNumber = Number(standard);
    if (!Number.isInteger(standardNumber) || standardNumber < 2 || standardNumber > 10) {
        return res.status(400).json({ message: 'Standard must be between 2 and 10.' });
    }

    try {
        const supabase = getSupabaseAdmin();

        const { data: paidTests, error: paidTestsError } = await supabase
            .from('tests')
            .select('id, price')
            .eq('standard', standardNumber)
            .eq('is_locked', true);

        if (paidTestsError) throw paidTestsError;

        let user = null;
        const userPrimary = await supabase
            .from('users')
            .select('id, purchased_standard_boxes, purchased_tests')
            .eq('id', req.user.id)
            .single();

        if (userPrimary.error && isMissingColumnError(userPrimary.error, 'purchased_standard_boxes')) {
            const userFallback = await supabase
                .from('users')
                .select('id, purchased_tests')
                .eq('id', req.user.id)
                .single();

            if (userFallback.error) throw userFallback.error;
            user = userFallback.data;
        } else {
            if (userPrimary.error) throw userPrimary.error;
            user = userPrimary.data;
        }

        const { data: box, error: boxError } = await supabase
            .from('paid_standard_boxes')
            .select('id, standard, amount, is_active')
            .eq('standard', standardNumber)
            .maybeSingle();

        if (boxError && !isMissingTableError(boxError, 'paid_standard_boxes')) {
            throw boxError;
        }

        const paidTestsInStandard = (paidTests || []).filter((test) => Number(test.price || 0) > 0);
        if (paidTestsInStandard.length <= 0) {
            return res.status(400).json({ message: 'No paid tests are available for this standard yet.' });
        }

        const firstPaidTest = paidTestsInStandard[0];

        if (box && !box.is_active) {
            return res.status(400).json({ message: 'This paid box is currently inactive.' });
        }

        const purchasedBoxes = user?.purchased_standard_boxes || [];
        if (purchasedBoxes.includes(standardNumber)) {
            return res.status(409).json({ message: 'This standard box is already unlocked.' });
        }

        const derivedAmount = Math.max(...paidTestsInStandard.map((test) => Number(test.price || 0)));
        const amount = box ? Number(box.amount || 0) : Number(derivedAmount || 0);
        if (amount <= 0) {
            return res.status(400).json({ message: 'Invalid box amount configured.' });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `std_box_${standardNumber}_${Date.now()}`,
        });

        let { error } = await supabase.from('payments').insert([{
            user_id: req.user.id,
            test_id: null,
            payment_type: 'standard_box',
            standard_value: standardNumber,
            box_id: box?.id || null,
            razorpay_order_id: order.id,
            amount,
            status: 'pending',
        }]);

        // Backward compatibility: older schemas may miss payment_type/standard_value/box_id or require non-null test_id.
        if (
            error && (
                isMissingColumnError(error, 'payment_type') ||
                isMissingColumnError(error, 'standard_value') ||
                isMissingColumnError(error, 'box_id') ||
                `${error?.message || ''} ${error?.details || ''}`.toLowerCase().includes('test_id')
            )
        ) {
            const fallbackTestId = firstPaidTest?.id;
            if (!fallbackTestId) {
                return res.status(500).json({ message: 'Payment setup fallback failed because no paid test could be linked.' });
            }

            const fallbackInsert = await supabase.from('payments').insert([{
                user_id: req.user.id,
                test_id: fallbackTestId,
                razorpay_order_id: order.id,
                amount,
                status: 'pending',
            }]);

            error = fallbackInsert.error;
        }

        if (error) throw error;
        logPayment('info', 'standard_box_order_created', {
            userId: req.user.id,
            orderId: order.id,
            standard: standardNumber,
            amount,
        });
        return res.json(order);
    } catch (error) {
        logPayment('error', 'standard_box_order_create_failed', {
            userId: req.user?.id,
            standard: standardNumber,
            reason: error?.message,
        });
        return sendSafeError(res, error, 'Unable to create paid box order. Please try again.');
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Protected
const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, standard_value, payment_type } = req.body;
    const razorpay = getRazorpayClient();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment verification fields.' });
    }

    if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: 'Payments are not configured yet. Please add Razorpay keys.' });
    }

    try {
        const signatureValid = validateAndMatchSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });

        if (!signatureValid) {
            logPayment('error', 'verification_signature_invalid', {
                userId: req.user?.id,
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
            });
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const supabase = getSupabaseAdmin();
        const result = await withRetries(
            () => finalizeVerification({
                supabase,
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                scopedUserId: req.user.id,
                standardValue: standard_value,
                paymentType: payment_type,
            }),
            PAYMENT_VERIFY_RETRY_ATTEMPTS,
            PAYMENT_VERIFY_RETRY_DELAY_MS,
            { orderId: razorpay_order_id, userId: req.user.id }
        );

        logPayment('info', result.alreadyVerified ? 'verification_already_completed' : 'verification_completed', {
            userId: req.user.id,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            paymentType: result.payment?.payment_type || payment_type || 'test',
            amount: result.payment?.amount,
        });

        return res.json({
            message: result.alreadyVerified ? 'Payment already verified' : 'Payment verified successfully',
        });
    } catch (err) {
        logPayment('error', 'verification_failed', {
            userId: req.user?.id,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            reason: err?.message,
        });
        return sendSafeError(res, err, 'Payment verification could not be completed. Please retry.');
    }
};

// @desc    Verify payment via Razorpay webhook (server-to-server)
// @route   POST /api/payments/webhook
// @access  Public (signature-verified)
const verifyPaymentWebhook = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return res.status(503).json({ message: 'Webhook is not configured.' });
    }

    try {
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            return res.status(400).json({ message: 'Missing webhook signature.' });
        }

        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
        const receivedBuffer = Buffer.from(String(signature), 'utf8');
        const signatureValid = expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

        if (!signatureValid) {
            logPayment('error', 'webhook_signature_invalid', { signaturePresent: true });
            return res.status(400).json({ message: 'Invalid webhook signature.' });
        }

        const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
        const eventType = body?.event;
        const payload = body?.payload;

        if (eventType !== 'payment.captured') {
            return res.status(200).json({ message: 'Webhook ignored', event: eventType });
        }

        const paymentEntity = payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        const paymentId = paymentEntity?.id;

        if (!orderId || !paymentId) {
            return res.status(400).json({ message: 'Invalid webhook payload.' });
        }

        const supabase = getSupabaseAdmin();
        const result = await withRetries(
            () => finalizeVerification({
                supabase,
                orderId,
                paymentId,
                scopedUserId: null,
                standardValue: null,
                paymentType: null,
            }),
            PAYMENT_VERIFY_RETRY_ATTEMPTS,
            PAYMENT_VERIFY_RETRY_DELAY_MS,
            { orderId, source: 'webhook' }
        );

        logPayment('info', result.alreadyVerified ? 'webhook_verification_already_completed' : 'webhook_verification_completed', {
            orderId,
            paymentId,
            paymentType: result.payment?.payment_type || 'test',
            amount: result.payment?.amount,
        });

        return res.status(200).json({ message: 'Webhook processed successfully.' });
    } catch (err) {
        logPayment('error', 'webhook_processing_failed', {
            reason: err?.message,
        });
        return sendSafeError(res, err, 'Webhook processing failed.');
    }
};

module.exports = {
    getPaymentConfig,
    createOrder,
    createStandardBoxOrder,
    verifyPayment,
    verifyPaymentWebhook,
};
