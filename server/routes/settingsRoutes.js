const express = require('express');
const router = express.Router();
const { getAdminEmailSettings, updateAdminEmailSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/admin-emails')
    .get(protect, admin, getAdminEmailSettings)
    .put(protect, admin, updateAdminEmailSettings);

module.exports = router;
