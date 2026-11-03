import axiosInstance from "../api/axiosInstance";
import { getAnalyticsSessionId } from "./analyticsSession";

function withAnalytics(payload = {}) {
  const sessionId = getAnalyticsSessionId();
  return {
    payload: { ...payload, sessionId },
    config: { headers: { "X-Analytics-Session-Id": sessionId } },
  };
}

export const authService = {
  getMonetization: () => axiosInstance.get("/settings/monetization"),
  register: (payload) => {
    const request = withAnalytics(payload);
    return axiosInstance.post("/auth/register", request.payload, request.config);
  },
  login: (payload) => {
    const request = withAnalytics(payload);
    return axiosInstance.post("/auth/login", request.payload, request.config);
  },
  logout: () => axiosInstance.post("/auth/logout"),
  getAccountOwnership: () => axiosInstance.get("/auth/account/ownership"),
  deactivateAccount: () => axiosInstance.post("/auth/account/deactivate"),
  deleteAccount: (payload) => axiosInstance.delete("/auth/account", { data: payload }),
  getProfile: () => axiosInstance.get("/auth/me"),
};
