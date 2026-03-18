const fs = require('fs/promises');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'admin-emails.json');

const normalizeEmails = (emails) => {
    return [...new Set((emails || [])
        .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter(Boolean))];
};

const readStoredAdminEmails = async () => {
    try {
        const raw = await fs.readFile(dataFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? normalizeEmails(parsed) : [];
    } catch {
        return [];
    }
};

const writeStoredAdminEmails = async (emails) => {
    const normalized = normalizeEmails(emails);
    await fs.writeFile(dataFilePath, JSON.stringify(normalized, null, 2), 'utf8');
    return normalized;
};

const getAdminEmails = async () => {
    const envEmails = normalizeEmails((process.env.ADMIN_EMAILS || '').split(','));
    const storedEmails = await readStoredAdminEmails();
    return normalizeEmails([...envEmails, ...storedEmails]);
};

module.exports = {
    getAdminEmails,
    writeStoredAdminEmails,
};
