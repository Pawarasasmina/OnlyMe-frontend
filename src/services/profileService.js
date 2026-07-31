import axiosInstance from "../api/axiosInstance";

export const profileService = {
  getMe: () => axiosInstance.get("/profile/me"),
  getUnifiedMe: () => axiosInstance.get("/profiles/me"),
  getUnifiedProfile: (username) => axiosInstance.get(`/profiles/${encodeURIComponent(username)}`),
  updateMe: (payload) => axiosInstance.patch("/profile/me", payload),
  getPrivacySettings: () => axiosInstance.get("/settings/privacy"),
  updatePrivacySettings: (payload) => axiosInstance.patch("/settings/privacy", payload),
  getNotificationSettings: () => axiosInstance.get("/settings/notifications"),
  updateNotificationSettings: (payload) => axiosInstance.patch("/settings/notifications", payload),
  getAccountSettings: () => axiosInstance.get("/settings/account"),
  updateAccountSettings: (payload) => axiosInstance.patch("/settings/account", payload),
  changePassword: (payload) => axiosInstance.patch("/profile/me/password", payload),
  getCompletion: () => axiosInstance.get("/profile/me/completion"),
  checkUsername: (username) => axiosInstance.get("/profile/username-availability", { params: { username } }),
  uploadAvatar: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return axiosInstance.post("/profile/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },
  removeAvatar: () => axiosInstance.delete("/profile/me/avatar"),
  uploadCover: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("cover", file);
    return axiosInstance.post("/profile/me/cover", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },
  removeCover: () => axiosInstance.delete("/profile/me/cover"),
  getPublicCreator: (username) => axiosInstance.get(`/creators/${username}`),
};
