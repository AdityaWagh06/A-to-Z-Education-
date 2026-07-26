const { getSupabaseAdmin } = require('../config/supabase');
const { sendGenericError, sendGenericMessage } = require('../utils/errorResponse');

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
        return sendGenericError(res, error, 500, 'Standards fetch error:');
    }
};

// @desc    Add a standard
// @route   POST /api/standards
const addStandard = async (req, res) => {
    try {
        const { label, value } = req.body;
        
        if (!label || !value) {
            return sendGenericMessage(res, 400);
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('standards')
            .insert([{ label, value }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        return sendGenericError(res, error, 500, 'Standard create error:');
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
        return sendGenericError(res, error, 500, 'Standard delete error:');
    }
};

module.exports = {
    getStandards,
    addStandard,
    deleteStandard,
};
