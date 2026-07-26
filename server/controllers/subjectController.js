const { readStoredSubjects, writeStoredSubjects, normalizeKey } = require('../utils/subjectStore');
const { sendGenericError, sendGenericMessage } = require('../utils/errorResponse');

const getSubjects = async (_req, res) => {
    try {
        const subjects = await readStoredSubjects();
        return res.json(subjects);
    } catch (error) {
        return sendGenericError(res, error, 500, 'Subjects fetch error:');
    }
};

const addSubject = async (req, res) => {
    const key = normalizeKey(req.body?.key);
    const label = String(req.body?.label || '').trim();

    if (!key || !label) {
        return sendGenericMessage(res, 400);
    }

    try {
        const subjects = await readStoredSubjects();
        if (subjects.some((subject) => subject.key === key)) {
            return sendGenericMessage(res, 409);
        }

        const updated = await writeStoredSubjects([...subjects, { key, label }]);
        return res.status(201).json(updated);
    } catch (error) {
        return sendGenericError(res, error, 500, 'Subject create error:');
    }
};

const deleteSubject = async (req, res) => {
    const key = normalizeKey(req.params?.key);

    if (!key) {
        return sendGenericMessage(res, 400);
    }

    try {
        const subjects = await readStoredSubjects();
        const remaining = subjects.filter((subject) => subject.key !== key);

        if (remaining.length === subjects.length) {
            return sendGenericMessage(res, 404);
        }

        const updated = await writeStoredSubjects(remaining);
        return res.json(updated);
    } catch (error) {
        return sendGenericError(res, error, 500, 'Subject delete error:');
    }
};

module.exports = {
    getSubjects,
    addSubject,
    deleteSubject,
};
