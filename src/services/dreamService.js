import api from "../api/axiosInstance";

export const dreamService = {
  getCreatorDream: (username) => api.get(`/dreams/creator/${encodeURIComponent(username)}`),
  saveMine: (payload) => api.put("/dreams/mine", payload),
  completeMine: (id, version) => api.post(`/dreams/mine/${id}/complete`, { version }),
  removeMine: (id, version) => api.delete(`/dreams/mine/${id}`, { data: { version } }),
  sendGift: (id, payload) => api.post(`/dreams/${id}/gifts`, payload),
};
