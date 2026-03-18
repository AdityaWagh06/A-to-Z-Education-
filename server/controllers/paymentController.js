const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { isSupabaseEnabled, getSupabaseAdmin } = require('../config/supabase');

const getRazorpayClient = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null;
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Protected
const createOrder = async (req, res) => {
    const { amount, testId } = req.body;
    const razorpay = getRazorpayClient();

    if (!razorpay) {
        return res.status(503).json({ message: 'Payments are not configured yet. Please add Razorpay keys.' });
    }

    const options = {
        amount: amount * 100, // amount in smallest currency unit
        currency: "INR",
        receipt: `receipt_order_${Date.now()}`
    };

    try {
        const order = await razorpay.orders.create(options);

        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            const { error } = await supabase.from('payments').insert({
                user_id: req.user._id,
                test_id: testId,
                razorpay_order_id: order.id,
                amount: Number(amount),
                status: 'pending'
            });
            if (error) throw error;

            return res.json(order);
        }
        
        // Save pending payment
        const payment = new Payment({
            user: req.user._id,
            test: testId,
            razorpayOrderId: order.id,
            amount: amount,
            status: 'pending'
        });
        await payment.save();

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Protected
const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, testId } = req.body;
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
        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .update({
                    status: 'completed',
                    razorpay_payment_id: razorpay_payment_id
                })
                .eq('razorpay_order_id', razorpay_order_id)
                .select('*')
                .single();

            if (paymentError) throw paymentError;

            const { data: user } = await supabase
                .from('users')
                .select('purchased_tests')
                .eq('id', payment.user_id)
                .single();

            const purchasedTests = user?.purchased_tests || [];
            if (!purchasedTests.includes(payment.test_id)) {
                purchasedTests.push(payment.test_id);
                await supabase
                    .from('users')
                    .update({ purchased_tests: purchasedTests })
                    .eq('id', payment.user_id);
            }

            return res.json({ message: 'Payment verified successfully' });
        }

        // Update payment status
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        if (payment) {
            payment.status = 'completed';
            payment.razorpayPaymentId = razorpay_payment_id;
            await payment.save();

            // Add test to user purchased tests
            const user = await User.findById(payment.user);
            if (!user.purchasedTests.includes(payment.test)) {
                user.purchasedTests.push(payment.test);
                await user.save();
            }
        }

        res.json({ message: "Payment verified successfully" });
    } else {
        res.status(400).json({ message: "Invalid signature" });
    }
};

module.exports = { createOrder, verifyPayment };
