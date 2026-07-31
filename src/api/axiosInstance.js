import axios from "axios";

const ACCESS_TOKEN_KEY = "onlyme_access_token";
let refreshPromise = null;

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

const authRefreshExclusions = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh",
  "/auth/logout",
];

function isAuthRefreshExcluded(url = "") {
  return authRefreshExclusions.some((path) => url.includes(path));
}

function clearAuthState() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.dispatchEvent(new Event("onlyme-auth-cleared"));
}

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;

    if (
      error.response?.status === 401
      && request
      && !request._retried
      && !request.skipAuthRefresh
      && !isAuthRefreshExcluded(request.url)
    ) {
      request._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axiosInstance.post("/auth/refresh", null, { skipAuthRefresh: true })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const response = await refreshPromise;
        const accessToken = response.data.data.accessToken;
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        request.headers = request.headers || {};
        request.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(request);
      } catch {
        clearAuthState();
      }
    } else if (error.response?.status === 401 && request?.url?.includes("/auth/refresh")) {
      clearAuthState();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
