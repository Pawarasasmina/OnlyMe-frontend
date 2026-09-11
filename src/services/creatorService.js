import axiosInstance from "../api/axiosInstance";

export const creatorService = {
  getCreators: () => axiosInstance.get("/creator"),
  getCreator: (username) => axiosInstance.get(`/creator/${encodeURIComponent(username)}`),
  getDashboard: () => axiosInstance.get("/creator/dashboard"),
};
