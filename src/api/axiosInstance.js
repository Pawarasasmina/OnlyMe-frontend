import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("onlyme_access_token");

  if (token && !token.startsWith("demo-token")) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("onlyme_access_token");
      localStorage.removeItem("onlyme_demo_user");
      window.dispatchEvent(new Event("onlyme-auth-cleared"));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
