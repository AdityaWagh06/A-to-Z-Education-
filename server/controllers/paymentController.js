const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getSupabaseAdmin } = require('../config/supabase');

const isMissingColumnError = (error, columnName) => {
    const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
    return details.includes('column') && details.includes(String(columnName || '').toLowerCase());
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
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

        const [{ data: box, error: boxError }, { data: user, error: userError }] = await Promise.all([
            supabase
                .from('paid_standard_boxes')
                .select('id, standard, amount, is_active')
                .eq('standard', standardNumber)
                .single(),
            supabase
                .from('users')
                .select('purchased_standard_boxes')
                .eq('id', req.user.id)
                .single(),
        ]);

        if (boxError || !box) {
            return res.status(404).json({ message: 'Paid box not found for this standard.' });
        }
        if (userError) throw userError;

        if (!box.is_active) {
            return res.status(400).json({ message: 'This paid box is currently inactive.' });
        }

        const { count: assignedCount, error: assignedError } = await supabase
            .from('tests')
            .select('id', { count: 'exact', head: true })
            .eq('standard', standardNumber)
            .eq('is_locked', true);

        const { data: firstPaidTest, error: firstPaidTestError } = await supabase
            .from('tests')
            .select('id')
            .eq('standard', standardNumber)
            .eq('is_locked', true)
            .limit(1)
            .maybeSingle();

        if (assignedError) throw assignedError;
        if (firstPaidTestError) throw firstPaidTestError;
        if (!assignedCount || assignedCount <= 0) {
            return res.status(400).json({ message: 'No tests are assigned to this box yet.' });
        }

        const purchasedBoxes = user?.purchased_standard_boxes || [];
        if (purchasedBoxes.includes(standardNumber)) {
            return res.status(409).json({ message: 'This standard box is already unlocked.' });
        }

        const amount = Number(box.amount || 0);
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
            box_id: box.id,
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
        return res.json(order);
    } catch (error) {
        return res.status(500).json({ message: error.message });
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

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(String(razorpay_signature), 'utf8');

    if (expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
        const supabase = getSupabaseAdmin();
        try {
            const { data: existingPayment, error: paymentLookupError } = await supabase
                .from('payments')
                .select('*')
                .eq('razorpay_order_id', razorpay_order_id)
                .eq('user_id', req.user.id)
                .single();

            if (paymentLookupError) throw paymentLookupError;
            if (!existingPayment) throw new Error('Payment record not found');

            if (existingPayment.status === 'completed') {
                return res.json({ message: 'Payment already verified' });
            }

            const standardHint = Number(standard_value || existingPayment.standard_value || 0);
            const requestedType = payment_type === 'standard_box' ? 'standard_box' : null;
            const inferredStandardBox =
                existingPayment.payment_type === 'standard_box' ||
                Boolean(existingPayment.box_id) ||
                Number(existingPayment.standard_value || 0) > 0 ||
                (requestedType === 'standard_box' && standardHint > 0);
            const paymentType = inferredStandardBox ? 'standard_box' : 'test';
            let expectedAmount = 0;

            if (paymentType === 'standard_box') {
                let boxQuery = supabase
                    .from('paid_standard_boxes')
                    .select('amount, standard');

                if (existingPayment.box_id) {
                    boxQuery = boxQuery.eq('id', existingPayment.box_id);
                } else if (standardHint) {
                    boxQuery = boxQuery.eq('standard', standardHint);
                }

                const { data: box, error: boxError } = await boxQuery.single();

                if (boxError || !box) {
                    return res.status(400).json({ message: 'Linked paid box not found for payment.' });
                }

                expectedAmount = Number(box.amount || 0);
                if (expectedAmount <= 0) {
                    return res.status(400).json({ message: 'This paid box has an invalid amount.' });
                }

                const standardToValidate = Number(existingPayment.standard_value || standardHint || box.standard);
                if (standardToValidate !== Number(box.standard)) {
                    return res.status(400).json({ message: 'Paid box standard mismatch.' });
                }

                const { count: assignedCount, error: assignedError } = await supabase
                    .from('tests')
                    .select('id', { count: 'exact', head: true })
                    .eq('standard', Number(standardToValidate))
                    .eq('is_locked', true);

                if (assignedError) throw assignedError;
                if (!assignedCount || assignedCount <= 0) {
                    return res.status(400).json({ message: 'This paid box has no assigned tests.' });
                }
            } else {
                const { data: test, error: testError } = await supabase
                    .from('tests')
                    .select('id, price, is_locked')
                    .eq('id', existingPayment.test_id)
                    .single();

                if (testError || !test) {
                    return res.status(400).json({ message: 'Linked test not found for payment.' });
                }

                expectedAmount = Number(test.price || 0);
                if (expectedAmount <= 0 || !test.is_locked) {
                    return res.status(400).json({ message: 'This test no longer requires payment.' });
                }
            }

            if (Number(existingPayment.amount || 0) !== expectedAmount) {
                return res.status(400).json({ message: 'Payment amount mismatch.' });
            }

            const { data: payment, error: updateError } = await supabase
                .from('payments')
                .update({ 
                    status: 'completed',
                    razorpay_payment_id: razorpay_payment_id
                })
                .eq('razorpay_order_id', razorpay_order_id)
                .eq('user_id', req.user.id)
                .eq('status', 'pending')
                .select('*')
                .single();

            if (updateError) throw updateError;
            if (!payment) throw new Error('Payment record not found');

            // Add access to user based on payment type
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('purchased_tests, purchased_standard_boxes')
                .eq('id', payment.user_id)
                .single();
            
            if (userError) throw userError;

            const purchasedTests = user.purchased_tests || [];
            const purchasedStandardBoxes = user.purchased_standard_boxes || [];

            const paymentStandardHint = Number(standard_value || payment.standard_value || 0);
            const shouldGrantStandardBox =
                payment.payment_type === 'standard_box' ||
                Boolean(payment.box_id) ||
                Number(payment.standard_value || 0) > 0 ||
                (payment_type === 'standard_box' && paymentStandardHint > 0);

            if (shouldGrantStandardBox) {
                const standardValue = Number(payment.standard_value || standardHint);
                if (!Number.isInteger(standardValue) || standardValue <= 0) {
                    return res.status(400).json({ message: 'Invalid standard value for paid test unlock.' });
                }
                if (!purchasedStandardBoxes.includes(standardValue)) {
                    purchasedStandardBoxes.push(standardValue);
                    const { error: updateUserError } = await supabase
                        .from('users')
                        .update({ purchased_standard_boxes: purchasedStandardBoxes })
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

            res.json({ message: "Payment verified successfully" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    } else {
        res.status(400).json({ message: "Invalid signature" });
    }
};

module.exports = { getPaymentConfig, createOrder, createStandardBoxOrder, verifyPayment };
