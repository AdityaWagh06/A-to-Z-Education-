const express = require('express');
const router = express.Router();
const { getVideos, addVideo, deleteVideo } = require('../controllers/videoController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getVideos)
    .post(protect, admin, addVideo);

router.route('/:id')
    .delete(protect, admin, deleteVideo);

module.exports = router;
