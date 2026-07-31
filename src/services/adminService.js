import axiosInstance from "../api/axiosInstance";

export const adminService = {
  getDashboard: () => axiosInstance.get("/admin/dashboard"),
  getUsers: () => axiosInstance.get("/admin/users"),
  updateUserStatus: (userId, status) => axiosInstance.patch(`/admin/users/${userId}/status`, { status }),
};


