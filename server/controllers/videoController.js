const { getSupabaseAdmin } = require('../config/supabase');

// @desc    Get all videos
// @access  Public
const getVideos = async (req, res) => {
    const { standard, subject } = req.query;
    try {
        const supabase = getSupabaseAdmin();
        // Changed ordering to ascending so the first inserted video remains first (Playlist order)
        let query = supabase.from('videos').select('*').order('created_at', { ascending: true });

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
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a video
// @access  Admin
const addVideo = async (req, res) => {
    const { title, youtubeUrl, thumbnail, subject, standard, duration } = req.body;
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('videos')
            .insert([{
                title,
                youtube_url: youtubeUrl,
                thumbnail,
                subject,
                standard: Number(standard),
                duration
            }])
            .select('*')
            .single();

        if (error) throw error;

        res.status(201).json({
            _id: data.id,
            title: data.title,
            youtubeUrl: data.youtube_url,
            thumbnail: data.thumbnail,
            subject: data.subject,
            standard: data.standard,
            duration: data.duration,
            createdAt: data.created_at
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a video
// @access  Admin
const deleteVideo = async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('videos').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Video removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a video
// @access  Admin
const updateVideo = async (req, res) => {
    const { title, youtubeUrl, thumbnail, subject, standard, duration } = req.body;
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('videos')
            .update({
                title,
                youtube_url: youtubeUrl,
                thumbnail,
                subject,
                standard: Number(standard),
                duration
            })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getVideos, addVideo, deleteVideo, updateVideo };
