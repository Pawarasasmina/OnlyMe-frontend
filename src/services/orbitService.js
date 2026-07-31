import axiosInstance from "../api/axiosInstance";

export const orbitService = {
  getOrbit: (params = {}) => axiosInstance.get("/orbit", { params }),
  refreshOrbit: (params = {}) => axiosInstance.get("/orbit", { params: { ...params, refresh: true } }),
  sendSeeYouSignal: (targetUserId) => axiosInstance.post("/orbit/signals", { targetUserId }),
  getSentSignals: () => axiosInstance.get("/orbit/signals/sent"),
  getCityProgress: () => axiosInstance.get("/orbit/cities"),
};
