export const GENERIC_ERROR_MESSAGE = "Something went wrong. We'll be back shortly.";

export const getGenericErrorMessage = () => GENERIC_ERROR_MESSAGE;

export const logClientError = (context, error) => {
  if (context) {
    console.error(context, error);
  } else {
    console.error(error);
  }
};