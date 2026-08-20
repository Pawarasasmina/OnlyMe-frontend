import axiosInstance from "../api/axiosInstance";

export const profileService = {
  getMe: () => axiosInstance.get("/profile/me"),
  getUnifiedMe: () => axiosInstance.get("/profiles/me"),
  getOwnConnections: (type) => axiosInstance.get("/profiles/me/connections", { params: { type } }),
  getConnections: (username, type) => axiosInstance.get(`/profiles/${encodeURIComponent(username)}/connections`, { params: { type } }),
  getOwnViewers: (params = {}) => axiosInstance.get("/profiles/me/viewers", { params }),
  getUnifiedProfile: (username) => axiosInstance.get(`/profiles/${encodeURIComponent(username)}`),
  getOrbitCreators: () => axiosInstance.get("/profiles/orbit"),
  toggleFollow: (username) => axiosInstance.put(`/profiles/${encodeURIComponent(username)}/follow`),
  toggleSeeSignal: (username) => axiosInstance.put(`/profiles/${encodeURIComponent(username)}/see-signal`),
  reportProfile: (username, payload) => axiosInstance.post(`/profiles/${encodeURIComponent(username)}/report`, payload),
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
  getMutedAccounts: () => axiosInstance.get("/settings/muted-accounts"),
  unmuteAccount: (userId) => axiosInstance.delete(`/settings/muted-accounts/${encodeURIComponent(userId)}`),
  getHiddenSeens: () => axiosInstance.get("/settings/hidden-seens"),
  showHiddenSeenAgain: (seenId) => axiosInstance.delete(`/settings/hidden-seens/${encodeURIComponent(seenId)}`),
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
