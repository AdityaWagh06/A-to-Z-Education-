const { createClient } = require('@supabase/supabase-js');

const isSupabaseEnabled = () => {
    return process.env.USE_SUPABASE === 'true' &&
        Boolean(process.env.SUPABASE_URL) &&
        Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
};

const getSupabaseAdmin = () => {
    if (!isSupabaseEnabled()) return null;

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
