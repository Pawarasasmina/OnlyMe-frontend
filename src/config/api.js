const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Production requests go through the frontend host. Besides avoiding CORS, this
// makes the secure session cookies first-party (important when third-party
// cookies are disabled, including Chrome Incognito).
export const API_BASE_URL = import.meta.env.PROD
  ? "/api"
  : configuredApiBaseUrl || "http://localhost:3104/api";

export const API_ORIGIN = import.meta.env.PROD
  ? window.location.origin
  : API_BASE_URL.replace(/\/api\/?$/, "");
