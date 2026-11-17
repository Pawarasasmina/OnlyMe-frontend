import api from "../api/axiosInstance";
export const wallHintService = {
  get: async () => (await api.get("/users/me/wall-hints")).data.data.dismissed || [],
  dismiss: async id => (await api.post(`/users/me/wall-hints/${encodeURIComponent(id)}`)).data.data.dismissed || [],
};
