const {
    applyCorsOrFail,
    buildProgress,
    generateToken,
    getAuthUser,
    getSupabaseAdmin,
    parseBody,
    send,
} = require('./_helpers');

module.exports = async (req, res) => {
    const cors = applyCorsOrFail(req, res);
    if (cors.blocked) return;

    if (req.method !== 'GET' && req.method !== 'PUT') {
        return send(res, 405, { message: 'Method not allowed' });
    }

    try {
        const supabase = getSupabaseAdmin();
        const authResult = await getAuthUser(req, supabase);
        if (authResult.error) {
            return send(res, authResult.status, { message: authResult.error });
        }

        const user = authResult.data;

        if (req.method === 'GET') {
            return send(res, 200, {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'student',
                standard: user.standard,
                progress: user.progress || buildProgress(),
                purchasedTests: user.purchased_tests || [],
                purchasedStandardBoxes: user.purchased_standard_boxes || [],
                picture: user.picture,
                mobile_no: user.mobile_no,
            });
        }

        const payload = parseBody(req);
        const parsedStandard = Number(payload.standard);
        const hasValidStandard = Number.isInteger(parsedStandard) && parsedStandard > 0;

        const { data: updated, error } = await supabase
            .from('users')
            .update({
                name: payload.name || user.name,
                standard: hasValidStandard ? parsedStandard : user.standard,
                mobile_no: payload.mobile || user.mobile_no,
            })
            .eq('id', user.id)
            .select('*')
            .single();

        if (error || !updated) {
            return send(res, 404, { message: 'User update failed' });
        }

        return send(res, 200, {
            _id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role || 'student',
            standard: updated.standard,
            mobile_no: updated.mobile_no,
            token: generateToken({ id: updated.id, role: updated.role || 'student' }),
        });
    } catch (error) {
        console.error('[auth/profile]', error?.message || error);
        return send(res, 500, { message: 'Something went wrong' });
    }
};
