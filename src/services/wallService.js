import api from "../api/axiosInstance";
export const wallService = {
  list: (params = {}) => api.get("/wall", { params }),
  create: ({ text, context, location, image }) => { const body = new FormData(); body.append("text", text); body.append("context", context); body.append("location", location || ""); if (image) body.append("image", image); return api.post("/wall", body); },
  comments: (id) => api.get(`/wall/${id}/comments`),
  react: (id) => api.put(`/wall/${id}/reaction`),
  comment: (id, text) => api.post(`/wall/${id}/comments`, { text }),
  share: (id, caption = "") => api.put(`/wall/${id}/share`, { caption }),
  save: (id) => api.put(`/wall/${id}/save`),
};
