const mongoose = require('mongoose');

const questionSchema = mongoose.Schema({
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true }, // Should match one of the options
    type: { type: String, enum: ['mcq', 'true_false'], default: 'mcq' }
});

const testSchema = mongoose.Schema({
    title: { type: String, required: true },
    subject: { 
        type: String, 
        required: true, 
        enum: ['maths', 'english', 'marathi', 'intelligence'] 
    },
    standard: { type: Number, required: true },
    price: { type: Number, default: 0 }, // 0 for free
    questions: [questionSchema], // Keep for backward compatibility or direct questions
    pdfPath: { type: String }, // Path to the uploaded PDF
    answerSheetPath: { type: String }, // Path to the uploaded Answer Key
    isLocked: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Test', testSchema);
