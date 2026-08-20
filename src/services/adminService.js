import axiosInstance from "../api/axiosInstance";

export const adminService = {
  getDashboard: () => axiosInstance.get("/admin/dashboard"),
  getUsers: () => axiosInstance.get("/admin/users"),
  updateUserStatus: (userId, status) => axiosInstance.patch(`/admin/users/${userId}/status`, { status }),
  getMessageReports: (params) => axiosInstance.get("/admin/message-reports", { params }),
  getReportedMessageUsers: () => axiosInstance.get("/admin/message-report-users"),
  getReportedMessageUser: (userId) => axiosInstance.get(`/admin/message-report-users/${userId}`),
  startMessageReportReview: (reportId) => axiosInstance.post(`/admin/user-reports/${reportId}/review`),
  startActualMessageReportReview: (reportId) => axiosInstance.post(`/admin/message-reports/${reportId}/review`),
  resolveMessageReport: (reportId, payload) => axiosInstance.post(`/admin/message-reports/${reportId}/resolve`, payload),
  getReportedUsers: () => axiosInstance.get("/admin/user-report-users"),
  getReportedUser: (userId) => axiosInstance.get(`/admin/user-report-users/${userId}`),
  startUserReportReview: (reportId) => axiosInstance.post(`/admin/user-reports/${reportId}/review`),
  resolveUserReport: (reportId, payload) => axiosInstance.post(`/admin/user-reports/${reportId}/resolve`, payload),
  getGifts: () => axiosInstance.get("/admin/gifts"),
  createGift: (formData, onUploadProgress) => axiosInstance.post("/admin/gifts", formData, { onUploadProgress }),
  updateGift: (id, formData, onUploadProgress) => axiosInstance.patch(`/admin/gifts/${id}`, formData, { onUploadProgress }),
  reorderGifts: (ids) => axiosInstance.patch("/admin/gifts/reorder", { ids }),
  deleteGift: (id) => axiosInstance.delete(`/admin/gifts/${id}`),
};


