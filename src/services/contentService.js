import axiosInstance from "../api/axiosInstance";

export const contentService = {
  getFeaturedContent: () => axiosInstance.get("/content"),
  getCreatorContent: (creatorId) => axiosInstance.get(`/content/creator/${creatorId}`),
};
