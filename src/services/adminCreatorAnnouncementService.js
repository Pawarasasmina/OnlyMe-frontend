import api from "../api/axiosInstance";

export const adminCreatorAnnouncementService = {
  options: () => api.get("/admin/creator-announcements/options"),
  preview: (audience, page = 1, limit = 50) => api.post("/admin/creator-announcements/preview", { audience, page, limit }),
  list: (page = 1) => api.get("/admin/creator-announcements", { params: { page } }),
  get: (id) => api.get(`/admin/creator-announcements/${id}`),
  create: (payload) => api.post("/admin/creator-announcements", payload),
  cancel: (id, reason) => api.post(`/admin/creator-announcements/${id}/cancel`, { reason }),
};
