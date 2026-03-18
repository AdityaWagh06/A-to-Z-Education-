const { getAdminEmails, writeStoredAdminEmails } = require('../utils/adminEmailStore');

const getAdminEmailSettings = async (_req, res) => {
    try {
        const emails = await getAdminEmails();
        return res.json({ emails });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateAdminEmailSettings = async (req, res) => {
    const { emails } = req.body;

    if (!Array.isArray(emails)) {
        return res.status(400).json({ message: 'emails must be an array' });
    }

    try {
        const updated = await writeStoredAdminEmails(emails);
        return res.json({ emails: updated });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAdminEmailSettings,
    updateAdminEmailSettings,
};
