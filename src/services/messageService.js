import axiosInstance from "../api/axiosInstance";

export const messageService = {
  getConversations: () => axiosInstance.get("/messages/conversations"),
  getMessages: (userId) => axiosInstance.get(`/messages/conversations/${userId}`),
  send: (userId, body) => axiosInstance.post(`/messages/conversations/${userId}`, { body }),
  searchPeople: (q = "") => axiosInstance.get("/messages/people", { params: { q } }),
  acceptRequest: (userId) => axiosInstance.post(`/messages/requests/${userId}/accept`),
  declineRequest: (userId) => axiosInstance.delete(`/messages/requests/${userId}`),
};
