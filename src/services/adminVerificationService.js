import axiosInstance from "../api/axiosInstance";

export const adminVerificationService = {
  list: (params) => axiosInstance.get("/admin/creator-verifications", { params }),
  listAll: async () => {
    const first = await axiosInstance.get("/admin/creator-verifications", { params: { page: 1, limit: 100 } });
    const data = first.data.data;
    const pages = data.pagination.pages || 1;
    if (pages <= 1) return data.items;
    const remaining = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => axiosInstance.get("/admin/creator-verifications", { params: { page: index + 2, limit: 100 } })));
    return [...data.items, ...remaining.flatMap((response) => response.data.data.items)];
  },
  getById: (id) => axiosInstance.get(`/admin/creator-verifications/${id}`),
  getHistory: (id) => axiosInstance.get(`/admin/creator-verifications/${id}/history`),
  getDocument: (id, documentType) => axiosInstance.get(`/admin/creator-verifications/${id}/document/${documentType}`, { responseType: "blob" }),
  approve: (id, { internalNote = "" }) => axiosInstance.post(`/admin/creator-verifications/${id}/approve`, { manualReviewConfirmed: true, adminInternalNote: internalNote }),
  requestChanges: (id, { reasons, creatorVisibleMessage, internalNote = "" }) => axiosInstance.post(`/admin/creator-verifications/${id}/request-changes`, { reasons, creatorVisibleMessage, adminInternalNote: internalNote }),
  reject: (id, { rejectionReason, creatorVisibleMessage, internalNote = "" }) => axiosInstance.post(`/admin/creator-verifications/${id}/reject`, { rejectionReason, creatorVisibleMessage, adminInternalNote: internalNote }),
};

