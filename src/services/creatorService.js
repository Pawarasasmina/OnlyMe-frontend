import axiosInstance from "../api/axiosInstance";

export const creatorService = {
  getCreators: () => axiosInstance.get("/creator"),
  getCreator: (username) => axiosInstance.get(`/creator/${encodeURIComponent(username)}`),
  getDashboard: () => axiosInstance.get("/creator/dashboard"),
  getGrow: () => axiosInstance.get("/creator/grow"),
  getInvitation: (code) => axiosInstance.get(`/creator/referrals/${encodeURIComponent(code)}`),
  getInvitationLanding: (code) => axiosInstance.get(`/creator/referrals/${encodeURIComponent(code)}/landing`),
  joinInvitation: (code) => axiosInstance.post(`/creator/referrals/${encodeURIComponent(code)}/join`),
};
