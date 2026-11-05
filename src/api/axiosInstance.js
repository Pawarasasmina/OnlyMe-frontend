import axios from "axios";
import { getAnalyticsSessionId } from "../services/analyticsSession";
import { localizedApiError, localizedValidationErrors } from "../i18n/errors.js";
import { rememberSessionReturnTo } from "../utils/sessionExpiry.js";

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
  const token = localStorage.getItem("onlyme_access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers["X-Analytics-Session-Id"] = getAnalyticsSessionId();
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isRefreshRequest = request?.url?.includes("/auth/refresh");
    const isPublicAuthRequest = ["/auth/login", "/auth/register", "/auth/refresh"].some((path) => request?.url?.includes(path));
    const hasAccessToken = Boolean(localStorage.getItem("onlyme_access_token"));

    if (error.response?.status === 401 && hasAccessToken && !request?._retried && !isPublicAuthRequest) {
      request._retried = true;
      try {
        refreshPromise ||= axiosInstance.post("/auth/refresh").finally(() => { refreshPromise = null; });
        const response = await refreshPromise;
        const accessToken = response.data.data.accessToken;
        localStorage.setItem("onlyme_access_token", accessToken);
        request.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(request);
      } catch (refreshError) {
        // A network error or backend 5xx does not prove that the session is
        // invalid. Preserve it so a cold start/outage cannot log the user out.
        if ([401, 403].includes(refreshError.response?.status)) {
          clearExpiredSessionAndRedirect();
        }
      }
    } else if (error.response?.status === 401 && isRefreshRequest) {
      clearExpiredSessionAndRedirect();
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
