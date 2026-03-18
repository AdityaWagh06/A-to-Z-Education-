const Announcement = require('../models/Announcement');
const { isSupabaseEnabled, getSupabaseAdmin } = require('../config/supabase');

// @desc    Get announcements
// @route   GET /api/announcements
// @access  Public
const getAnnouncements = async (req, res) => {
    try {
        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false });
            if (error) throw error;

            return res.json((data || []).map((a) => ({
                _id: a.id,
                title: a.title,
                description: a.description,
                active: a.active,
                createdAt: a.created_at
            })));
        }

        const announcements = await Announcement.find({ active: true }).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Admin
const createAnnouncement = async (req, res) => {
    const { title, description } = req.body;

    try {
        if (isSupabaseEnabled()) {
            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase
                .from('announcements')
                .insert({ title, description, active: true })
                .select('*')
                .single();
            if (error) throw error;

            return res.status(201).json({
                _id: data.id,
                title: data.title,
                description: data.description,
                active: data.active,
                createdAt: data.created_at
            });
        }

        const announcement = new Announcement({
            title,
            description
        });

        const createdAnnouncement = await announcement.save();
        res.status(201).json(createdAnnouncement);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { getAnnouncements, createAnnouncement };
