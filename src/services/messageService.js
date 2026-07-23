import axiosInstance from "../api/axiosInstance";

export const messageService = {
  getConversations: () => axiosInstance.get("/messages/conversations"),
  getMessages: (userId) => axiosInstance.get(`/messages/conversations/${userId}`),
  send: (userId, body, replyToId = null) => axiosInstance.post(`/messages/conversations/${userId}`, { body, replyToId }),
  sendVoice: (userId, blob, waveform = []) => {
    const data = new FormData();
    const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    data.append("voice", blob, `voice-${Date.now()}.${extension}`);
    data.append("waveform", JSON.stringify(waveform));
    return axiosInstance.post(`/messages/conversations/${userId}/voice`, data);
  },
  setReaction: (messageId, emoji) => axiosInstance.put(`/messages/${messageId}/reaction`, { emoji }),
  removeReaction: (messageId) => axiosInstance.delete(`/messages/${messageId}/reaction`),
  searchPeople: (q = "") => axiosInstance.get("/messages/people", { params: { q } }),
  acceptRequest: (userId) => axiosInstance.post(`/messages/requests/${userId}/accept`),
  declineRequest: (userId) => axiosInstance.delete(`/messages/requests/${userId}`),
};
