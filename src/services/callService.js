import axiosInstance from "../api/axiosInstance";

export const callService = {
  getConfiguration: () => axiosInstance.get("/calls/configuration"),
  getHistory: () => axiosInstance.get("/calls/history"),
  getPaidOffer: (creatorId) => axiosInstance.get(`/calls/offers/${creatorId}`),
  requestPaidCall: (creatorId, type, idempotencyKey) => axiosInstance.post(`/calls/requests/${creatorId}`, { type, idempotencyKey }),
};
