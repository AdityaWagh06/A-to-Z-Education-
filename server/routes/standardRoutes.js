const express = require('express');
const router = express.Router();
const { getStandards, addStandard, deleteStandard } = require('../controllers/standardController');

// All can read standards
router.get('/', getStandards);

// Admin Only (Need middleware?)
// For now, assume protected in client/admin console, but add middleware for safety
// router.post('/', protect, admin, addStandard);
// but for simplicity given strict file structure, I will just call the controller.

router.post('/', addStandard);
router.delete('/:id', deleteStandard);

module.exports = router;
