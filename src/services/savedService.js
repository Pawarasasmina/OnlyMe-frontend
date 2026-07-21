import api from "../api/axiosInstance";

export const savedService = {
  list: () => api.get("/saved"),
};
