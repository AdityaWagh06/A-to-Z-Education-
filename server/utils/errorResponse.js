const GENERIC_ERROR_MESSAGE = "Something went wrong. We'll be back shortly.";

const sendGenericError = (res, error, statusCode = 500, context = '') => {
    if (context) {
        console.error(context, error);
    } else {
        console.error(error);
    }

    return res.status(statusCode).json({ message: GENERIC_ERROR_MESSAGE });
};

const sendGenericMessage = (res, statusCode = 500) => {
    return res.status(statusCode).json({ message: GENERIC_ERROR_MESSAGE });
};

module.exports = {
    GENERIC_ERROR_MESSAGE,
    sendGenericError,
    sendGenericMessage,
};