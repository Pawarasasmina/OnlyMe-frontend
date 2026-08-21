import axiosInstance from "../api/axiosInstance";

export const moderationWarningService = {
  listPending: () => axiosInstance.get("/users/me/moderation-warnings"),
  acknowledge: (warningId) => axiosInstance.post(`/users/me/moderation-warnings/${encodeURIComponent(warningId)}/acknowledge`),
};
