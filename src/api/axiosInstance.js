import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3104/api",
  withCredentials: true,
});

let refreshPromise = null;

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("onlyme_access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      } catch {
        localStorage.removeItem("onlyme_access_token");
      }
    } else if (error.response?.status === 401 && isRefreshRequest) {
      localStorage.removeItem("onlyme_access_token");
      window.dispatchEvent(new Event("onlyme-auth-cleared"));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
