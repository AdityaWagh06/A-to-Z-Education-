const { getSupabaseAdmin } = require('../config/supabase');

// @desc    Get all standards
// @route   GET /api/standards
const getStandards = async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('standards')
            .select('*')
            .order('value', { ascending: true });

        if (error) throw error;
        
        // Return sorted data. If empty, client handles it or admin must add.
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Add a standard
// @route   POST /api/standards
const addStandard = async (req, res) => {
    try {
        const { label, value } = req.body;
        
        if (!label || !value) {
            return res.status(400).json({ message: 'Label and value (number) are required' });
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('standards')
            .insert([{ label, value }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Delete a standard
// @route   DELETE /api/standards/:id
const deleteStandard = async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from('standards')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Standard removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getStandards,
    addStandard,
    deleteStandard,
};
