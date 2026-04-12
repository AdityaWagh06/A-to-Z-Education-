const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
	getPaymentConfig,
	createOrder,
	createStandardBoxOrder,
	verifyPayment,
	verifyPaymentWebhook,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Stricter limits for payment actions to reduce automated abuse.
const createOrderLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: 'Too many payment order requests. Please try again later.' }
});

const verifyPaymentLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 40,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: 'Too many payment verification requests. Please try again later.' }
});

router.get('/config', getPaymentConfig);

// Webhook remains unauthenticated but signature-verified in controller.
router.post('/webhook', verifyPaymentWebhook);

// Backward-compatible existing endpoints.
router.post('/order', protect, createOrderLimiter, createOrder);
router.post('/standard-box/order', protect, createOrderLimiter, createStandardBoxOrder);
router.post('/verify', protect, verifyPaymentLimiter, verifyPayment);

// Production aliases requested for clearer API naming.
router.post('/create-order', protect, createOrderLimiter, createOrder);
router.post('/verify-payment', protect, verifyPaymentLimiter, verifyPayment);

module.exports = router;
