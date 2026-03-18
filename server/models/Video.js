const mongoose = require('mongoose');

const videoSchema = mongoose.Schema({
    title: { type: String, required: true },
    youtubeUrl: { type: String, required: true },
    thumbnail: { type: String }, // URL or generated
    subject: { 
        type: String, 
        required: true, 
        enum: ['maths', 'english', 'marathi', 'intelligence'] 
    },
    standard: { type: Number, required: true },
    duration: { type: String } // e.g., "10:05"
}, {
    timestamps: true
});

module.exports = mongoose.model('Video', videoSchema);
