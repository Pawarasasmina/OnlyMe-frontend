import { msg as __msg } from "../i18n/runtime.js";
export const fallbackMessages = {
  get validation() { return __msg("apiErrors.pleaseCheckTheEnteredInformationAndTryAgain"); },
  get credentials() { return __msg("apiErrors.theEmailAddressOrPasswordIsIncorrect"); },
  get network() { return __msg("apiErrors.unableToConnectToTheServerCheckYour"); },
  get rateLimit() { return __msg("apiErrors.tooManyAttemptsPleaseWaitAMomentAnd"); },
  get server() { return __msg("apiErrors.somethingWentWrongPleaseTryAgain"); },
};

function isHtml(value) {
  return typeof value === "string" && /<html|<!doctype/i.test(value);
}

export function normalizeApiError(error, fallback = fallbackMessages.server) {
  if (!error?.response) {
    return {
      message: fallbackMessages.network,
      errors: {},
      status: 0,
    };
  }

  const { status, data } = error.response;
  if (status === 429) {
    return {
      message: data?.message || fallbackMessages.rateLimit,
      errors: data?.errors || {},
      status,
    };
  }

  const safeMessage = data?.message && !isHtml(data.message) ? data.message : fallback;

  return {
    message: safeMessage,
    errors: data?.errors || {},
    status,
  };
}
