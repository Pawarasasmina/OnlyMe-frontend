import axiosInstance from "../api/axiosInstance";

export const fanService = {
  getDashboard: () => axiosInstance.get("/fan/dashboard"),
  getSubscriptions: (params = {}) => axiosInstance.get("/fan/subscriptions", { params }),
  getWallet: (params = {}) => axiosInstance.get("/fan/wallet", { params }),
  getPurchases: (params = {}) => axiosInstance.get("/fan/purchases", { params }),
  getActivity: (params = {}) => axiosInstance.get("/fan/activity", { params }),
};
