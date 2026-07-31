export const fallbackMessages = {
  validation: "Please check the entered information and try again.",
  credentials: "The email address or password is incorrect.",
  network: "Unable to connect to the server. Check your connection and try again.",
  rateLimit: "Too many attempts. Please wait a moment and try again.",
  server: "Something went wrong. Please try again.",
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
