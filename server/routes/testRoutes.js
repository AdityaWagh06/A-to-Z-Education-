const express = require('express');
const router = express.Router();
const {
    getTests,
    getTestById,
    createTest,
    submitTest,
    deleteTest,
    updateTest,
    getPaidStandardBoxes,
    upsertPaidStandardBox,
    deletePaidStandardBox,
} = require('../controllers/testController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getTests)
    .post(protect, admin, createTest);

router.get('/paid-standard-boxes', getPaidStandardBoxes);
router.post('/paid-standard-boxes', protect, admin, upsertPaidStandardBox);
router.delete('/paid-standard-boxes/:id', protect, admin, deletePaidStandardBox);

router.route('/:id')
    .get(protect, getTestById)
    .delete(protect, admin, deleteTest)
    .put(protect, admin, updateTest);

router.post('/:id/submit', protect, submitTest);

module.exports = router;
