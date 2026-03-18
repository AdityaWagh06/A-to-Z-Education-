const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    standard: { type: Number, enum: [2, 3, 4, 5], default: null }, // Selected standard
    progress: {
        maths: {
            lessonsCompleted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
            testsTaken: [{
                testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
                score: Number,
                total: Number
            }]
        },
        english: {
            lessonsCompleted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
            testsTaken: [{
                testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
                score: Number,
                total: Number
            }]
        },
        marathi: {
            lessonsCompleted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
            testsTaken: [{
                testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
                score: Number,
                total: Number
            }]
        },
        intelligence: {
            lessonsCompleted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
            testsTaken: [{
                testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
                score: Number,
                total: Number
            }]
        }
    },
    purchasedTests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
