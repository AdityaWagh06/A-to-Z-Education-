const { readStoredSubjects, writeStoredSubjects, normalizeKey } = require('../utils/subjectStore');

const getSubjects = async (_req, res) => {
    try {
        const subjects = await readStoredSubjects();
        return res.json(subjects);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const addSubject = async (req, res) => {
    const key = normalizeKey(req.body?.key);
    const label = String(req.body?.label || '').trim();

    if (!key || !label) {
        return res.status(400).json({ message: 'Both key and label are required.' });
    }

    try {
        const subjects = await readStoredSubjects();
        if (subjects.some((subject) => subject.key === key)) {
            return res.status(409).json({ message: 'Subject key already exists.' });
        }

        const updated = await writeStoredSubjects([...subjects, { key, label }]);
        return res.status(201).json(updated);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteSubject = async (req, res) => {
    const key = normalizeKey(req.params?.key);

    if (!key) {
        return res.status(400).json({ message: 'Subject key is required.' });
    }

    try {
        const subjects = await readStoredSubjects();
        const remaining = subjects.filter((subject) => subject.key !== key);

        if (remaining.length === subjects.length) {
            return res.status(404).json({ message: 'Subject not found.' });
        }

        const updated = await writeStoredSubjects(remaining);
        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSubjects,
    addSubject,
    deleteSubject,
};
