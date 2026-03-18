const mongoose = require('mongoose');

const announcementSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    active: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);
