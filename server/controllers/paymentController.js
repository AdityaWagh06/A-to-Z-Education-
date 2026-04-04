const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getSupabaseAdmin } = require('../config/supabase');

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

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Protected
const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const razorpay = getRazorpayClient();

    if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: 'Payments are not configured yet. Please add Razorpay keys.' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        const supabase = getSupabaseAdmin();
        try {
            // Update payment status
            const { data: payment, error: updateError } = await supabase
                .from('payments')
                .update({ 
                    status: 'completed',
                    razorpay_payment_id: razorpay_payment_id
                })
                .eq('razorpay_order_id', razorpay_order_id)
                .eq('user_id', req.user.id)
                .select('*')
                .single();

            if (updateError) throw updateError;
            if (!payment) throw new Error('Payment record not found');

            // Add test access to user
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('purchased_tests')
                .eq('id', payment.user_id)
                .single();
            
            if (userError) throw userError;

            const purchasedTests = user.purchased_tests || [];
            // Check if testId already exists
            if (!purchasedTests.includes(payment.test_id)) {
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

module.exports = { getPaymentConfig, createOrder, verifyPayment };
