import axiosInstance from "../api/axiosInstance";

export const adminService = {
  getDashboard: () => axiosInstance.get("/admin/dashboard"),
  getUsers: () => axiosInstance.get("/admin/users"),
  updateUserStatus: (userId, status) => axiosInstance.patch(`/admin/users/${userId}/status`, { status }),
  updateCreatorApproval: (userId, approvalStatus) =>
    axiosInstance.patch(`/admin/users/${userId}/creator-approval`, { approvalStatus }),
  getContent: () => axiosInstance.get("/admin/content"),
  updateContentStatus: (contentId, status) => axiosInstance.patch(`/admin/content/${contentId}/status`, { status }),
};
