import axiosInstance from "../api/axiosInstance";

export const profileService = {
  getMe: () => axiosInstance.get("/profile/me"),
  getUnifiedMe: () => axiosInstance.get("/profiles/me"),
  getUnifiedProfile: (username) => axiosInstance.get(`/profiles/${encodeURIComponent(username)}`),
  updateMe: (payload) => axiosInstance.patch("/profile/me", payload),
  changePassword: (payload) => axiosInstance.patch("/profile/me/password", payload),
  getCompletion: () => axiosInstance.get("/profile/me/completion"),
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
