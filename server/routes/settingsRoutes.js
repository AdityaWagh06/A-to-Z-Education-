const express = require('express');
const router = express.Router();
const {
    getAdminEmailSettings,
    updateAdminEmailSettings,
    sendBroadcastEmail,
    getStudentPurchases,
    updateStudentPurchases,
    getAdminOverviewStats,
} = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/admin-emails')
    .get(protect, admin, getAdminEmailSettings)
    .put(protect, admin, updateAdminEmailSettings);

router.post('/broadcast-email', protect, admin, sendBroadcastEmail);
router.get('/student-purchases', protect, admin, getStudentPurchases);
router.put('/student-purchases/:userId', protect, admin, updateStudentPurchases);
router.get('/overview-stats', protect, admin, getAdminOverviewStats);

module.exports = router;
