import api from "../api/axiosInstance";
export const wallViewService = {
  get: async signal => (await api.get("/users/me/wall-view", { signal })).data.data.view || "feed",
  save: async view => (await api.patch("/users/me/wall-view", { view })).data.data.view,
};
