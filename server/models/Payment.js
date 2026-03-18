const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
