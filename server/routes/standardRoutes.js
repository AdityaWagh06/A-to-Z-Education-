const express = require('express');
const router = express.Router();
const { getStandards, addStandard, deleteStandard } = require('../controllers/standardController');
const { protect, admin } = require('../middleware/authMiddleware');

// All can read standards
router.get('/', getStandards);

router.post('/', protect, admin, addStandard);
router.delete('/:id', protect, admin, deleteStandard);

module.exports = router;
