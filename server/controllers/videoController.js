const Video = require('../models/Video');
const { isSupabaseEnabled, getSupabaseAdmin } = require('../config/supabase');

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
const getVideos = async (req, res) => {
    const { standard, subject } = req.query;
    try {
        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            let query = supabase.from('videos').select('*').order('created_at', { ascending: false });
            if (standard) query = query.eq('standard', Number(standard));
            if (subject) query = query.eq('subject', subject);
            const { data, error } = await query;
            if (error) throw error;

            return res.json((data || []).map((v) => ({
                _id: v.id,
                title: v.title,
                youtubeUrl: v.youtube_url,
                thumbnail: v.thumbnail,
                subject: v.subject,
                standard: v.standard,
                duration: v.duration,
                createdAt: v.created_at
            })));
        }

        const query = {};
        if (standard) query.standard = standard;
        if (subject) query.subject = subject;

        const videos = await Video.find(query);
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a video
// @route   POST /api/videos
// @access  Admin
const addVideo = async (req, res) => {
    const { title, youtubeUrl, thumbnail, subject, standard, duration } = req.body;

    try {
        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase
                .from('videos')
                .insert({
                    title,
                    youtube_url: youtubeUrl,
                    thumbnail,
                    subject,
                    standard: Number(standard),
                    duration
                })
                .select('*')
                .single();

            if (error) throw error;

            return res.status(201).json({
                _id: data.id,
                title: data.title,
                youtubeUrl: data.youtube_url,
                thumbnail: data.thumbnail,
                subject: data.subject,
                standard: data.standard,
                duration: data.duration,
                createdAt: data.created_at
            });
        }

        const video = new Video({
            title,
            youtubeUrl,
            thumbnail,
            subject,
            standard,
            duration
        });

        const createdVideo = await video.save();
        res.status(201).json(createdVideo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a video
// @route   DELETE /api/videos/:id
// @access  Admin
const deleteVideo = async (req, res) => {
    try {
        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            const { error } = await supabase.from('videos').delete().eq('id', req.params.id);
            if (error) throw error;
            return res.json({ message: 'Video removed' });
        }

        const video = await Video.findById(req.params.id);
        if (video) {
            await video.remove();
            res.json({ message: 'Video removed' });
        } else {
            res.status(404).json({ message: 'Video not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getVideos, addVideo, deleteVideo };
