import axiosInstance from "../api/axiosInstance";
const base = "/admin/content-moderation";
export const adminContentService = {
  listModerationContent: (params) => axiosInstance.get(base, { params }),
  getModerationContent: (id) => axiosInstance.get(`${base}/${id}`),
  getModerationHistory: (id) => axiosInstance.get(`${base}/${id}/history`),
  approveContent: (id, payload) => axiosInstance.post(`${base}/${id}/approve`, payload),
  requestContentChanges: (id, payload) => axiosInstance.post(`${base}/${id}/request-changes`, payload),
  rejectContent: (id, payload) => axiosInstance.post(`${base}/${id}/reject`, payload),
};
