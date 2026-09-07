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
  register: (payload) => {
    const request = withAnalytics(payload);
    return axiosInstance.post("/auth/register", request.payload, request.config);
  },
  login: (payload) => {
    const request = withAnalytics(payload);
    return axiosInstance.post("/auth/login", request.payload, request.config);
  },
  logout: () => axiosInstance.post("/auth/logout"),
  deleteAccount: () => axiosInstance.delete("/auth/account"),
  getProfile: () => axiosInstance.get("/auth/me"),
};
