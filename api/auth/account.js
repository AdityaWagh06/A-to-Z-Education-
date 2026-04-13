const {
    applyCorsOrFail,
    getAuthUser,
    getSupabaseAdmin,
    parseBody,
    send,
} = require('./_helpers');

module.exports = async (req, res) => {
    const cors = applyCorsOrFail(req, res);
    if (cors.blocked) return;

    if (req.method !== 'DELETE') {
        return send(res, 405, { message: 'Method not allowed' });
    }

    try {
        const supabase = getSupabaseAdmin();
        const authResult = await getAuthUser(req, supabase);
        if (authResult.error) {
            return send(res, authResult.status, { message: authResult.error });
        }

        const user = authResult.data;
        const { confirmText, emailConfirm } = parseBody(req);

        if (String(confirmText || '').trim().toUpperCase() !== 'DELETE') {
            return send(res, 400, { message: 'Type DELETE to confirm account deletion.' });
        }

        if (!emailConfirm || String(emailConfirm).trim().toLowerCase() !== String(user.email || '').trim().toLowerCase()) {
            return send(res, 400, { message: 'Email verification failed.' });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);

        if (error) throw error;
        return send(res, 200, { message: 'Account deleted successfully.' });
    } catch (error) {
        console.error('[auth/account]', error?.message || error);
        return send(res, 500, { message: 'Could not delete account.' });
    }
};
