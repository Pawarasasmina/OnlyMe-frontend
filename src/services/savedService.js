import api from "../api/axiosInstance";

export const savedService = {
  overview: () => api.get("/saved/overview"),
  category: (category, params = {}) => api.get(`/saved/${encodeURIComponent(category)}`, { params }),
  list: () => api.get("/saved"),
  savePlace: (id) => api.post(`/saved/places/${encodeURIComponent(id)}`),
  unsavePlace: (id) => api.delete(`/saved/places/${encodeURIComponent(id)}`),
  saveJourney: (id) => api.post(`/saved/journeys/${encodeURIComponent(id)}`),
  unsaveJourney: (id) => api.delete(`/saved/journeys/${encodeURIComponent(id)}`),
  saveBook: (id) => api.post(`/saved/books/${encodeURIComponent(id)}`),
  unsaveBook: (id) => api.delete(`/saved/books/${encodeURIComponent(id)}`),
  saveComment: (id) => api.post(`/saved/comments/${encodeURIComponent(id)}`),
  unsaveComment: (id) => api.delete(`/saved/comments/${encodeURIComponent(id)}`),
};
