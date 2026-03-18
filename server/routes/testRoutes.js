const express = require('express');
const router = express.Router();
const { getTests, getTestById, createTest, submitTest } = require('../controllers/testController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getTests)
    .post(protect, admin, createTest);

router.route('/:id')
    .get(protect, getTestById);

router.post('/:id/submit', protect, submitTest);

module.exports = router;
