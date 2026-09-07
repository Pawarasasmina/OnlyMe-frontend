import axiosInstance from "../api/axiosInstance";

export const messageService = {
  getConversations: () => axiosInstance.get("/messages/conversations"),
  getGifts: (recipientId) => axiosInstance.get("/messages/gifts", { params: { recipientId } }),
  getMessages: (userId, { cursor = null, limit = 50, directAccessWindowId = null } = {}) => axiosInstance.get(
    `/messages/conversations/${userId}`,
    { params: { limit, ...(cursor ? { cursor } : {}), ...(directAccessWindowId ? { directAccessWindowId } : {}) } },
  ),
  send: (userId, body, replyToId = null, clientMessageId, directAccessWindowId = null, disappearAfterSeconds = null) => axiosInstance.post(
    `/messages/conversations/${userId}`,
    { body, replyToId, clientMessageId, directAccessWindowId, disappearAfterSeconds },
  ),
  sendGift: (userId, giftId, idempotencyKey, disappearAfterSeconds = null) => axiosInstance.post(`/messages/conversations/${userId}/gifts`, { giftId, idempotencyKey, disappearAfterSeconds }),
  sendVoice: (userId, blob, waveform = [], directAccessWindowId = null, clientMessageId = null, disappearAfterSeconds = null) => {
    const data = new FormData();
    const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    data.append("voice", blob, `voice-${Date.now()}.${extension}`);
    data.append("waveform", JSON.stringify(waveform));
    data.append("clientMessageId", clientMessageId);
    if (disappearAfterSeconds !== null) data.append("disappearAfterSeconds", disappearAfterSeconds);
    if (directAccessWindowId) data.append("directAccessWindowId", directAccessWindowId);
    return axiosInstance.post(`/messages/conversations/${userId}/voice`, data);
  },
  sendVideoNote: (userId, blob, onProgress, directAccessWindowId = null, clientMessageId = null, disappearAfterSeconds = null) => {
    const data = new FormData();
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    const uploadBlob = new Blob([blob], { type: extension === "mp4" ? "video/mp4" : "video/webm" });
    data.append("video", uploadBlob, `video-note-${Date.now()}.${extension}`);
    data.append("clientMessageId", clientMessageId);
    if (disappearAfterSeconds !== null) data.append("disappearAfterSeconds", disappearAfterSeconds);
    if (directAccessWindowId) data.append("directAccessWindowId", directAccessWindowId);
    return axiosInstance.post(`/messages/conversations/${userId}/video-note`, data, {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
  },
  sendImage: (userId, file, clientMessageId, onProgress, directAccessWindowId = null, disappearAfterSeconds = null) => {
    const data = new FormData();
    data.append("image", file);
    data.append("clientMessageId", clientMessageId);
    if (disappearAfterSeconds !== null) data.append("disappearAfterSeconds", disappearAfterSeconds);
    if (directAccessWindowId) data.append("directAccessWindowId", directAccessWindowId);
    return axiosInstance.post(`/messages/conversations/${userId}/image`, data, {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
  },
  deleteMessage: (messageId, scope = "me") => axiosInstance.delete(`/messages/${messageId}`, { params: { scope } }),
  openDisappearing: (messageId) => axiosInstance.put(`/messages/${messageId}/open`),
  consumeDisappearing: (messageId) => axiosInstance.put(`/messages/${messageId}/consume`),
  deleteConversation: (userId) => axiosInstance.delete(`/messages/conversations/${userId}`),
  archiveConversation: (userId, archived = true) => axiosInstance.put(`/messages/conversations/${userId}/archive`, { archived }),
  muteConversation: (userId, muted = true) => axiosInstance.put(`/messages/conversations/${userId}/mute`, { muted }),
  reportMessage: (messageId, payload) => axiosInstance.post(`/messages/${messageId}/report`, payload),
  forwardMessage: (messageId, targets) => axiosInstance.post(`/messages/${messageId}/forward`, { targets }),
  reportConversation: (userId, payload) => axiosInstance.post(`/messages/conversations/${userId}/report`, payload),
  block: (userId) => axiosInstance.put(`/messages/blocks/${userId}`),
  unblock: (userId) => axiosInstance.delete(`/messages/blocks/${userId}`),
  setReaction: (messageId, emoji) => axiosInstance.put(`/messages/${messageId}/reaction`, { emoji }),
  removeReaction: (messageId) => axiosInstance.delete(`/messages/${messageId}/reaction`),
  searchPeople: (q = "") => axiosInstance.get("/messages/people", { params: { q } }),
  getGroups: () => axiosInstance.get("/messages/groups"),
  createGroup: (name, memberIds, avatarUrl = "") => axiosInstance.post("/messages/groups", { name, memberIds, avatarUrl }),
  getGroupMessages: (groupId, { cursor = null, limit = 50 } = {}) => axiosInstance.get(`/messages/groups/${groupId}`, { params: { limit, ...(cursor ? { cursor } : {}) } }),
  sendGroupMessage: (groupId, body, replyToId, clientMessageId) => axiosInstance.post(`/messages/groups/${groupId}`, { body, replyToId, clientMessageId }),
  sendGroupVoice: (groupId, blob, waveform, clientMessageId) => { const data = new FormData(); data.append("voice", blob, `voice-${Date.now()}.webm`); data.append("waveform", JSON.stringify(waveform)); data.append("clientMessageId", clientMessageId); return axiosInstance.post(`/messages/groups/${groupId}/voice`, data); },
  sendGroupImage: (groupId, file, clientMessageId, onProgress) => { const data = new FormData(); data.append("image", file); data.append("clientMessageId", clientMessageId); return axiosInstance.post(`/messages/groups/${groupId}/image`, data, { onUploadProgress: (event) => event.total && onProgress?.(Math.round((event.loaded / event.total) * 100)) }); },
  sendGroupVideoNote: (groupId, blob, clientMessageId, onProgress) => { const data = new FormData(); data.append("video", blob, `video-note-${Date.now()}.webm`); data.append("clientMessageId", clientMessageId); return axiosInstance.post(`/messages/groups/${groupId}/video-note`, data, { onUploadProgress: (event) => event.total && onProgress?.(Math.round((event.loaded / event.total) * 100)) }); },
  updateGroup: (groupId, payload) => axiosInstance.patch(`/messages/groups/${groupId}`, payload),
  updateGroupAvatar: (groupId, file) => {
    const data = new FormData();
    data.append("avatar", file);
    return axiosInstance.post(`/messages/groups/${groupId}/avatar`, data);
  },
  removeGroupAvatar: (groupId) => axiosInstance.delete(`/messages/groups/${groupId}/avatar`),
  archiveGroup: (groupId, archived = true) => axiosInstance.put(`/messages/groups/${groupId}/archive`, { archived }),
  muteGroup: (groupId, muted = true) => axiosInstance.put(`/messages/groups/${groupId}/mute`, { muted }),
  pinGroupToProfile: (groupId, pinned = true) => axiosInstance.put(`/messages/groups/${groupId}/profile-pin`, { pinned }),
  addGroupMember: (groupId, userId) => axiosInstance.post(`/messages/groups/${groupId}/members`, { userId }),
  removeGroupMember: (groupId, userId) => axiosInstance.delete(`/messages/groups/${groupId}/members/${userId}`),
  setGroupAdmin: (groupId, userId, admin) => axiosInstance.put(`/messages/groups/${groupId}/admins/${userId}`, { admin }),
  deleteGroup: (groupId) => axiosInstance.delete(`/messages/groups/${groupId}`),
  setGroupReaction: (messageId, emoji) => axiosInstance.put(`/messages/groups/messages/${messageId}/reaction`, { emoji }),
  removeGroupReaction: (messageId) => axiosInstance.delete(`/messages/groups/messages/${messageId}/reaction`),
  markGroupDelivered: (messageId, read = false) => axiosInstance.put(`/messages/groups/messages/${messageId}/delivered`, { read }),
  deleteGroupMessage: (messageId, scope = "me") => axiosInstance.delete(`/messages/groups/messages/${messageId}`, { params: { scope } }),
  reportGroupMessage: (messageId, payload) => axiosInstance.post(`/messages/groups/messages/${messageId}/report`, payload),
  forwardGroupMessage: (messageId, targets) => axiosInstance.post(`/messages/groups/messages/${messageId}/forward`, { targets }),
  acceptRequest: (userId) => axiosInstance.post(`/messages/requests/${userId}/accept`),
  declineRequest: (userId) => axiosInstance.delete(`/messages/requests/${userId}`),
  getDirectAccessOffer: (creatorId) => axiosInstance.get(`/messages/direct-access/offers/${creatorId}`),
  getDirectAccessWindows: (params = {}) => axiosInstance.get("/messages/direct-access/windows", { params }),
  openDirectAccessWindow: (creatorId, idempotencyKey, source = "PAID", creatorQuestionMessageId = null) => axiosInstance.post(
    `/messages/direct-access/windows/${creatorId}`,
    { idempotencyKey, source, creatorQuestionMessageId },
  ),
  updateDirectAccessSettings: (enabled, priceStars, callSettings = {}) => axiosInstance.put(
    "/messages/direct-access/settings",
    { enabled, priceStars, callEnabled: callSettings.callEnabled, callPriceStars: callSettings.callPriceStars, callDurationMinutes: callSettings.callDurationMinutes, callAutoDeclineAway: callSettings.callAutoDeclineAway },
  ),
  askDirectAccessQuestion: (fanId, body, clientMessageId) => axiosInstance.post(
    `/messages/direct-access/ask/${fanId}`,
    { body, clientMessageId },
  ),
  sendFreeDirectAccessFollowup: (creatorId, body, clientMessageId, idempotencyKey) => axiosInstance.post(`/messages/direct-access/follow-up/${creatorId}`, { body, clientMessageId, idempotencyKey }),
  replyToFreeDirectAccessFollowup: (messageId, body, clientMessageId, idempotencyKey) => axiosInstance.post(`/messages/direct-access/follow-up/${messageId}/reply`, { body, clientMessageId, idempotencyKey }),
};
