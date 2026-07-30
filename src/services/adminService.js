import axiosInstance from "../api/axiosInstance";

export const adminService = {
  getDashboard: () => axiosInstance.get("/admin/dashboard"),
  getUsers: () => axiosInstance.get("/admin/users"),
  updateUserStatus: (userId, status) => axiosInstance.patch(`/admin/users/${userId}/status`, { status }),
  getMessageReports: (params) => axiosInstance.get("/admin/message-reports", { params }),
  getReportedMessageUsers: () => axiosInstance.get("/admin/message-report-users"),
  getReportedMessageUser: (userId) => axiosInstance.get(`/admin/message-report-users/${userId}`),
  startMessageReportReview: (reportId) => axiosInstance.post(`/admin/message-reports/${reportId}/review`),
  resolveMessageReport: (reportId, payload) => axiosInstance.post(`/admin/message-reports/${reportId}/resolve`, payload),
};


