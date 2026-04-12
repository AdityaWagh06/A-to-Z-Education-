const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getSubjects, addSubject, deleteSubject } = require('../controllers/subjectController');

router.get('/', getSubjects);
router.post('/', protect, admin, addSubject);
router.delete('/:key', protect, admin, deleteSubject);

module.exports = router;
