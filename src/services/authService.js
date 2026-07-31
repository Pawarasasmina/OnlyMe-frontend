import axiosInstance from "../api/axiosInstance";

export const authService = {
  register: (payload) => axiosInstance.post("/auth/register", payload),
  login: (payload) => axiosInstance.post("/auth/login", payload),
  forgotPassword: (email) => axiosInstance.post("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword, confirmPassword) => axiosInstance.post("/auth/reset-password", {
    token,
    newPassword,
    confirmPassword,
  }),
  refresh: () => axiosInstance.post("/auth/refresh", null, { skipAuthRefresh: true }),
  logout: () => axiosInstance.post("/auth/logout"),
  getProfile: () => axiosInstance.get("/auth/me"),
};
