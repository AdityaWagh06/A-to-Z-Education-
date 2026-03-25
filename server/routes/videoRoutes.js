const express = require('express');
const router = express.Router();
const { getVideos, addVideo, deleteVideo, updateVideo } = require('../controllers/videoController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getVideos)
    .post(protect, admin, addVideo);

router.route('/:id')
    .delete(protect, admin, deleteVideo)
    .put(protect, admin, updateVideo);

module.exports = router;
