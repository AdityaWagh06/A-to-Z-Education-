const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getSupabaseAdmin } = require('../config/supabase');

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

                const standardToValidate = Number(existingPayment.standard_value || standardHint || 0);
                if (!Number.isInteger(standardToValidate) || standardToValidate <= 0) {
                    return res.status(400).json({ message: 'Invalid standard for paid test unlock.' });
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
                    return res.status(400).json({ message: 'This paid box has no paid tests.' });
                }

                if (box) {
                    if (standardToValidate !== Number(box.standard)) {
                        return res.status(400).json({ message: 'Paid box standard mismatch.' });
                    }
                    expectedAmount = Number(box.amount || 0);
                } else {
                    expectedAmount = Math.max(...paidTestsInStandard.map((test) => Number(test.price || 0)));
                }

                if (expectedAmount <= 0) {
                    return res.status(400).json({ message: 'This paid box has an invalid amount.' });
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
