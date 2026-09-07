import api from "../api/axiosInstance";
export const wallService = {
  list: (params = {}) => api.get("/wall", { params }),
  create: ({ attachedEntities = [], entityRefs = [], text, context, location, image }) => { const body = new FormData(); body.append("text", text); body.append("context", context); body.append("location", location || ""); body.append("entityRefs", JSON.stringify(entityRefs.length ? entityRefs : attachedEntities.map((entity) => ({ entityId: entity.id, entityType: entity.type })))); if (image) body.append("image", image); return api.post("/wall", body); },
  comments: (id, shareId) => api.get(`/wall/${id}/comments`, { params: shareId ? { shareId } : {} }),
  reactions: (id, shareId) => api.get(`/wall/${id}/reactions`, { params: shareId ? { shareId } : {} }),
  react: (id, reaction = "like", shareId) => api.put(`/wall/${id}/reaction`, { reaction, shareId }),
  comment: (id, text, shareId) => api.post(`/wall/${id}/comments`, { text, shareId }),
  share: (id, caption = "") => api.put(`/wall/${id}/share`, { caption }),
  save: (id, shareId) => api.put(`/wall/${id}/save`, { shareId }),
  getSawYouToday: () => api.get("/wall/saw-you-today"),
  acknowledgeSawYouToday: (events = []) => api.post("/wall/saw-you-today/acknowledge", {
    [events[0]?.eventId ? "events" : "eventIds"]: events,
  }),
};
