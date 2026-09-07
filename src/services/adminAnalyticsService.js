import api from "../api/axiosInstance";

export const adminAnalyticsService = {
  getReport: (params = {}) => api.get("/admin/analytics", { params }),
  exportReport: (params = {}) => api.get("/admin/analytics/export", { params, responseType: ["csv", "pdf"].includes(params.format) ? "blob" : "json" }),
};
