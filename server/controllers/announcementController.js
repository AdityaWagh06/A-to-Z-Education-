const { getSupabaseAdmin } = require('../config/supabase');

// @desc    Get announcements
// @access  Public
const getAnnouncements = async (req, res) => {
    try {
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
            link: a.link, // Include link in response
            active: a.active,
            createdAt: a.created_at
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add announcement
// @access  Admin
const createAnnouncement = async (req, res) => {
    const { title, description, link } = req.body;
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('announcements')
            .insert([{
                title,
                description,
                link, // Save the link
                active: true
            }])
            .select('*')
            .single();

        if (error) throw error;

        res.status(201).json({
            _id: data.id,
            title: data.title,
            description: data.description,
            link: data.link,
            active: data.active,
            createdAt: data.created_at
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete announcement
// @access  Admin
const deleteAnnouncement = async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Announcement removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement };
