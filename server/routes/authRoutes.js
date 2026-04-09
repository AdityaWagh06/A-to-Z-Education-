const express = require('express');
const router = express.Router();
const { googleLogin, getUserProfile, updateUserProfile, deleteUserAccount } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/google', googleLogin);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.delete('/account', protect, deleteUserAccount);

module.exports = router;
