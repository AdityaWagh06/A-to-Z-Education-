const {
    applyCorsOrFail,
    buildProgress,
    decodeJwtPayload,
    generateToken,
    getMissingColumnFromError,
    getRoleForEmail,
    getSupabaseAdmin,
    parseBody,
    send,
    verifyGoogleToken,
} = require('./_helpers');

module.exports = async (req, res) => {
    const cors = applyCorsOrFail(req, res);
    if (cors.blocked) return;

    if (req.method !== 'POST') {
        return send(res, 405, { message: 'Method not allowed' });
    }

    const { token, name: providedName, mobile, standard, mode } = parseBody(req);
    const authMode = String(mode || 'login').toLowerCase() === 'register' ? 'register' : 'login';

    if (!token) {
        return send(res, 400, { message: 'Google token is required.' });
    }

    try {
        let name;
        let email;
        let googleId;
        let picture;

        try {
            const payload = await verifyGoogleToken(token);
            name = providedName || payload.name;
            email = payload.email;
            googleId = payload.sub;
            picture = payload.picture;
        } catch (verifyError) {
            if (process.env.ALLOW_DEV_GOOGLE_BYPASS !== 'true') {
                throw verifyError;
            }

            const payload = decodeJwtPayload(token);
            if (!payload || !payload.email) {
                return send(res, 401, { message: 'Google Auth Failed' });
            }

            name = providedName || payload.name || String(payload.email).split('@')[0];
            email = payload.email;
            googleId = payload.sub || payload.email;
            picture = payload.picture;
        }

        const resolvedRole = getRoleForEmail(email);
        const parsedStandard = Number(standard);
        const hasValidStandard = Number.isInteger(parsedStandard) && parsedStandard > 0;

        const supabase = getSupabaseAdmin();
        const { data: existing, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (findError) throw findError;

        if (!existing && authMode === 'login') {
            return send(res, 404, { message: 'User does not exist. Please sign up first.' });
        }

        if (existing && authMode === 'register') {
            return send(res, 409, { message: 'User already exists. Please log in.' });
        }

        let user = existing;

        if (user) {
            const updates = {
                google_id: googleId,
                role: resolvedRole,
                picture,
                last_login_at: new Date().toISOString(),
            };
            if (name) updates.name = name;
            if (mobile) updates.mobile_no = mobile;
            if (hasValidStandard) updates.standard = parsedStandard;

            let updatePayload = { ...updates };
            let updated = null;
            let updateError = null;

            for (let attempt = 0; attempt < 5; attempt += 1) {
                const result = await supabase
                    .from('users')
                    .update(updatePayload)
                    .eq('id', user.id)
                    .select('*')
                    .single();

                updated = result.data;
                updateError = result.error;
                if (!updateError) break;

                const missingColumn = getMissingColumnFromError(updateError, ['last_login_at', 'mobile_no', 'standard', 'picture']);
                if (!missingColumn) break;
                delete updatePayload[missingColumn];
            }

            if (updateError) throw updateError;
            user = updated;
        } else {
            const insertPayload = {
                name,
                email,
                google_id: googleId,
                role: resolvedRole,
                progress: buildProgress(),
                purchased_tests: [],
                picture,
                mobile_no: mobile,
                standard: hasValidStandard ? parsedStandard : null,
                last_login_at: new Date().toISOString(),
            };

            let createPayload = { ...insertPayload };
            let created = null;
            let createError = null;

            for (let attempt = 0; attempt < 5; attempt += 1) {
                const result = await supabase
                    .from('users')
                    .insert(createPayload)
                    .select('*')
                    .single();

                created = result.data;
                createError = result.error;
                if (!createError) break;

                const missingColumn = getMissingColumnFromError(createError, ['last_login_at', 'mobile_no', 'standard', 'picture']);
                if (!missingColumn) break;
                delete createPayload[missingColumn];
            }

            if (createError) throw createError;
            user = created;
        }

        return send(res, 200, {
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'student',
            standard: user.standard,
            progress: user.progress || buildProgress(),
            purchasedTests: user.purchased_tests || [],
            purchasedStandardBoxes: user.purchased_standard_boxes || [],
            token: generateToken({ id: user.id, role: user.role || 'student' }),
            picture: picture || user.picture,
            mobile_no: user.mobile_no,
        });
    } catch (error) {
        console.error('[auth/google]', error?.message || error);
        return send(res, 401, { message: 'Google Auth Failed' });
    }
};
