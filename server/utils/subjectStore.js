const fs = require('fs/promises');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'subjects.json');

const DEFAULT_SUBJECTS = [
    { key: 'maths', label: 'Maths' },
    { key: 'english', label: 'English' },
    { key: 'marathi', label: 'Marathi' },
    { key: 'intelligence', label: 'Intelligence Test' }
];

const normalizeKey = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const normalizeSubjects = (subjects) => {
    const seen = new Set();
    const normalized = [];

    for (const entry of (Array.isArray(subjects) ? subjects : [])) {
        const key = normalizeKey(entry?.key);
        const label = String(entry?.label || '').trim();
        if (!key || !label || seen.has(key)) continue;
        seen.add(key);
        normalized.push({ key, label });
    }

    return normalized;
};

const readStoredSubjects = async () => {
    try {
        const raw = await fs.readFile(dataFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        const normalized = normalizeSubjects(parsed);
        return normalized.length > 0 ? normalized : DEFAULT_SUBJECTS;
    } catch {
        return DEFAULT_SUBJECTS;
    }
};

const writeStoredSubjects = async (subjects) => {
    const normalized = normalizeSubjects(subjects);
    const finalList = normalized.length > 0 ? normalized : DEFAULT_SUBJECTS;
    await fs.writeFile(dataFilePath, JSON.stringify(finalList, null, 2), 'utf8');
    return finalList;
};

module.exports = {
    readStoredSubjects,
    writeStoredSubjects,
    normalizeKey,
};
