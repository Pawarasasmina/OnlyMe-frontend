import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

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

    if (error.response?.status === 401 && !request?._retried && !isRefreshRequest) {
      request._retried = true;
      try {
        const response = await axiosInstance.post("/auth/refresh");
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
