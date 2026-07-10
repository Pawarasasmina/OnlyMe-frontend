import axiosInstance from "../api/axiosInstance";

export const userService = {
  getCurrentUser: () => axiosInstance.get("/users/me"),
};
