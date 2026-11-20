import axios from "axios";
import { getAnalyticsSessionId } from "../services/analyticsSession";
import { localizedApiError, localizedValidationErrors } from "../i18n/errors.js";
import { rememberSessionReturnTo } from "../utils/sessionExpiry.js";

// Remove credentials left by pre-cookie releases. Authentication now lives
// exclusively in Secure, HttpOnly cookies that application JavaScript cannot read.
localStorage.removeItem("onlyme_access_token");

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3104/api",
  withCredentials: true,
  timeout: 15000,
});

let refreshPromise = null;
let sessionRedirectStarted = false;

function clearExpiredSessionAndRedirect() {
  localStorage.removeItem("onlyme_access_token");
  window.dispatchEvent(new Event("onlyme-auth-cleared"));
  if (sessionRedirectStarted || window.location.pathname === "/login") return;
  sessionRedirectStarted = true;
  rememberSessionReturnTo();
  window.location.replace("/login");
}

axiosInstance.interceptors.request.use((config) => {
  config.headers["X-Requested-With"] = "XMLHttpRequest";
  config.headers["X-Analytics-Session-Id"] = getAnalyticsSessionId();

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isPublicAuthRequest = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password"].some((path) => request?.url?.includes(path));
    if (error.response?.status === 401 && !request?._retried && !isPublicAuthRequest) {
      request._retried = true;
      try {
        refreshPromise ||= axiosInstance.post("/auth/refresh")
          .catch(async (refreshError) => {
            // Mobile browsers can briefly omit a cross-site cookie while
            // resuming, rotating the screen, or changing network. A single
            // 401/403 must not immediately destroy an otherwise valid UI
            // session; confirm it once before clearing local auth state.
            if (![401, 403].includes(refreshError.response?.status)) throw refreshError;
            await new Promise(resolve => window.setTimeout(resolve, 750));
            return axiosInstance.post("/auth/refresh", null, { _sessionRecovery: true });
          })
          .finally(() => { refreshPromise = null; });
        await refreshPromise;
        return axiosInstance(request);
      } catch (refreshError) {
        // A network error or backend 5xx does not prove that the session is
        // invalid. Preserve it so a cold start/outage cannot log the user out.
        if ([401, 403].includes(refreshError.response?.status)) {
          clearExpiredSessionAndRedirect();
        }
      }
    }

    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(response => response, error => {
  if (error.response?.data && typeof error.response.data === "object") {
    error.response.data.message = localizedApiError(error);
    if (error.response.data.errors) error.response.data.errors = localizedValidationErrors(error.response.data.errors);
  }
  return Promise.reject(error);
});

export default axiosInstance;
