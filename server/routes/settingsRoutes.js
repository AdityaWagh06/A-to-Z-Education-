const express = require('express');
const router = express.Router();
const { getAdminEmailSettings, updateAdminEmailSettings, sendBroadcastEmail } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/admin-emails')
    .get(protect, admin, getAdminEmailSettings)
    .put(protect, admin, updateAdminEmailSettings);

router.post('/broadcast-email', protect, admin, sendBroadcastEmail);

module.exports = router;
