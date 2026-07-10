import axiosInstance from "../api/axiosInstance";

export const authService = {
  register: (payload) => axiosInstance.post("/auth/register", payload),
  login: (payload) => axiosInstance.post("/auth/login", payload),
  logout: () => axiosInstance.post("/auth/logout"),
  getProfile: () => axiosInstance.get("/auth/me"),
};
