import api from "../api/axiosInstance";

export const savedService = {
  overview: () => api.get("/saved/overview"),
  category: (category, params = {}) => api.get(`/saved/${encodeURIComponent(category)}`, { params }),
  list: () => api.get("/saved"),
};
