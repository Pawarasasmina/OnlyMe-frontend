import axiosInstance from "../api/axiosInstance";

export const callService = {
  getConfiguration: () => axiosInstance.get("/calls/configuration"),
  getHistory: () => axiosInstance.get("/calls/history"),
  getPaidOffer: (creatorId) => axiosInstance.get(`/calls/offers/${creatorId}`),
  requestPaidCall: (creatorId, type, idempotencyKey, topic, priority) => axiosInstance.post(`/calls/requests/${creatorId}`, { type, idempotencyKey, topic, priority }),
  schedulePaidCall: (callId, scheduledFor) => axiosInstance.patch(`/calls/requests/${callId}/schedule`, { scheduledFor }),
  requestReschedule: (callId) => axiosInstance.post(`/calls/requests/${callId}/reschedule`),
};
