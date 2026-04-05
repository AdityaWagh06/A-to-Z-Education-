const express = require('express');
const router = express.Router();
const { getPaymentConfig, createOrder, createStandardBoxOrder, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/config', getPaymentConfig);
router.post('/order', protect, createOrder);
router.post('/standard-box/order', protect, createStandardBoxOrder);
router.post('/verify', protect, verifyPayment);

module.exports = router;
