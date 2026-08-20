const GENERIC_ERROR_MESSAGE = "Something went wrong. We'll be back shortly.";

const sendGenericError = (res, error, statusCode = 500, context = '') => {
    if (context) {
        console.error(context, error);
    } else {
        console.error(error);
    }

    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? GENERIC_ERROR_MESSAGE : (error?.message || GENERIC_ERROR_MESSAGE);

    return res.status(statusCode).json({
        message,
        ...(isProd ? {} : { details: error?.stack || error })
    });
};

const sendGenericMessage = (res, statusCode = 500) => {
    return res.status(statusCode).json({ message: GENERIC_ERROR_MESSAGE });
};

module.exports = {
    GENERIC_ERROR_MESSAGE,
    sendGenericError,
    sendGenericMessage,
};