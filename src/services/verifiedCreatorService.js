import axiosInstance from "../api/axiosInstance";

export const verifiedCreatorService = {
  getMine: () => axiosInstance.get("/creator/verified-status"),
  apply: (payload) => axiosInstance.post("/creator/verified-status/apply", payload),
  renew: (idempotencyKey) => axiosInstance.post("/creator/verified-status/renew", { idempotencyKey }),
  listAdmin: (status) => axiosInstance.get("/admin/verified-creators", { params: status ? { status } : {} }),
  updatePlan: (starsPerMonth) => axiosInstance.put("/admin/verified-creators/plan", { starsPerMonth }),
  approve: (id, payload = {}) => axiosInstance.post(`/admin/verified-creators/${id}/approve`, payload),
  reject: (id, payload = {}) => axiosInstance.post(`/admin/verified-creators/${id}/reject`, payload),
};
