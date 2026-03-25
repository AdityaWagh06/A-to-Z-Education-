const { createClient } = require('@supabase/supabase-js');

const isSupabaseEnabled = () => true;

const getSupabaseAdmin = () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase credentials in .env');
    }

    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

module.exports = {
    isSupabaseEnabled,
    getSupabaseAdmin
};
