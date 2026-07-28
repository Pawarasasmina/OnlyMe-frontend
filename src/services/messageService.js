import axiosInstance from "../api/axiosInstance";

export const messageService = {
  getConversations: () => axiosInstance.get("/messages/conversations"),
  getMessages: (userId, { cursor = null, limit = 50 } = {}) => axiosInstance.get(
    `/messages/conversations/${userId}`,
    { params: { limit, ...(cursor ? { cursor } : {}) } },
  ),
  send: (userId, body, replyToId = null, clientMessageId) => axiosInstance.post(
    `/messages/conversations/${userId}`,
    { body, replyToId, clientMessageId },
  ),
  sendVoice: (userId, blob, waveform = []) => {
    const data = new FormData();
    const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    data.append("voice", blob, `voice-${Date.now()}.${extension}`);
    data.append("waveform", JSON.stringify(waveform));
    return axiosInstance.post(`/messages/conversations/${userId}/voice`, data);
  },
  sendVideoNote: (userId, blob, onProgress) => {
    const data = new FormData();
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    const uploadBlob = new Blob([blob], { type: extension === "mp4" ? "video/mp4" : "video/webm" });
    data.append("video", uploadBlob, `video-note-${Date.now()}.${extension}`);
    return axiosInstance.post(`/messages/conversations/${userId}/video-note`, data, {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
  },
  sendImage: (userId, file, clientMessageId, onProgress) => {
    const data = new FormData();
    data.append("image", file);
    data.append("clientMessageId", clientMessageId);
    return axiosInstance.post(`/messages/conversations/${userId}/image`, data, {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
  },
  deleteMessage: (messageId, scope = "me") => axiosInstance.delete(`/messages/${messageId}`, { params: { scope } }),
  reportMessage: (messageId, payload) => axiosInstance.post(`/messages/${messageId}/report`, payload),
  reportConversation: (userId, payload) => axiosInstance.post(`/messages/conversations/${userId}/report`, payload),
  block: (userId) => axiosInstance.put(`/messages/blocks/${userId}`),
  unblock: (userId) => axiosInstance.delete(`/messages/blocks/${userId}`),
  setReaction: (messageId, emoji) => axiosInstance.put(`/messages/${messageId}/reaction`, { emoji }),
  removeReaction: (messageId) => axiosInstance.delete(`/messages/${messageId}/reaction`),
  searchPeople: (q = "") => axiosInstance.get("/messages/people", { params: { q } }),
  acceptRequest: (userId) => axiosInstance.post(`/messages/requests/${userId}/accept`),
  declineRequest: (userId) => axiosInstance.delete(`/messages/requests/${userId}`),
};
