import axiosInstance from "../api/axiosInstance";

export const profileService = {
  getMe: () => axiosInstance.get("/profile/me"),
  getUnifiedMe: () => axiosInstance.get("/profiles/me"),
  getOwnConnections: (type) => axiosInstance.get("/profiles/me/connections", { params: { type } }),
  getUnifiedProfile: (username) => axiosInstance.get(`/profiles/${encodeURIComponent(username)}`),
  getOrbitCreators: () => axiosInstance.get("/profiles/orbit"),
  toggleFollow: (username) => axiosInstance.put(`/profiles/${encodeURIComponent(username)}/follow`),
  toggleSeeSignal: (username) => axiosInstance.put(`/profiles/${encodeURIComponent(username)}/see-signal`),
  updateMe: (payload) => axiosInstance.patch("/profile/me", payload),
  changePassword: (payload) => axiosInstance.patch("/profile/me/password", payload),
  getCompletion: () => axiosInstance.get("/profile/me/completion"),
  getPrivacySettings: () => axiosInstance.get("/settings/privacy"),
  updatePrivacySettings: (payload) => axiosInstance.patch("/settings/privacy", payload),
  getNotificationSettings: () => axiosInstance.get("/settings/notifications"),
  updateNotificationSettings: (payload) => axiosInstance.patch("/settings/notifications", payload),
  getAccountSettings: () => axiosInstance.get("/settings/account"),
  updateAccountSettings: (payload) => axiosInstance.patch("/settings/account", payload),
  getBlockedAccounts: () => axiosInstance.get("/settings/blocked-accounts"),
  unblockAccount: (userId) => axiosInstance.delete(`/settings/blocked-accounts/${encodeURIComponent(userId)}`),
  checkUsername: (username) => axiosInstance.get("/profile/username-availability", { params: { username } }),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return axiosInstance.post("/profile/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  removeAvatar: () => axiosInstance.delete("/profile/me/avatar"),
  uploadCover: (file) => {
    const formData = new FormData();
    formData.append("cover", file);
    return axiosInstance.post("/profile/me/cover", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  removeCover: () => axiosInstance.delete("/profile/me/cover"),
  getPublicCreator: (username) => axiosInstance.get(`/creators/${username}`),
};
