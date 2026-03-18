const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement } = require('../controllers/announcementController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getAnnouncements)
    .post(protect, admin, createAnnouncement);

module.exports = router;
