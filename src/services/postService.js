import axiosInstance from "../api/axiosInstance";

function normalizePost(raw = {}) {
  const media = raw.media || raw.images || [];
  return {
    ...raw,
    id: raw.id || raw._id,
    author: raw.author || raw.creator || null,
    comments: (raw.comments || []).map((comment) => ({
      ...comment,
      id: comment.id || comment._id,
      author: comment.author || comment.user || null,
    })),
    media: media.map((item) => ({
      ...item,
      id: item.id || item._id || item.assetId || item.url,
      url: item.url || item.secureUrl,
      type: item.type || "image",
    })),
  };
}

function normalizeList(response) {
  const data = response.data?.data || {};
  return {
    items: (data.items || []).map(normalizePost),
    pagination: data.pagination || null,
  };
}

export const postService = {
  getFeedPosts: async (params = {}) => normalizeList(await axiosInstance.get("/posts", { params })),
  getMyPosts: async (params = {}) => normalizeList(await axiosInstance.get("/posts/mine", { params })),
  getDrafts: async () => normalizeList(await axiosInstance.get("/posts/drafts")),
  createPost: async (formData, options = {}) => {
    const response = await axiosInstance.post("/posts", formData, {
      onUploadProgress: options.onUploadProgress,
      signal: options.signal,
    });
    return normalizePost(response.data?.data?.post);
  },
  saveDraft: async (formData, options = {}) => {
    const response = await axiosInstance.post("/posts/drafts", formData, {
      onUploadProgress: options.onUploadProgress,
      signal: options.signal,
    });
    return normalizePost(response.data?.data?.post);
  },
  updatePost: async (postId, payload) => {
    const response = await axiosInstance.put(`/posts/${postId}`, payload);
    return normalizePost(response.data?.data?.post);
  },
  reactToPost: async (postId, reaction) => {
    const response = await axiosInstance.put(`/posts/${postId}/reaction`, { reaction });
    return normalizePost(response.data?.data?.post);
  },
  createComment: async (postId, text) => {
    const response = await axiosInstance.post(`/posts/${postId}/comments`, { text });
    return normalizePost(response.data?.data?.post);
  },
  toggleSave: async (postId) => {
    const response = await axiosInstance.put(`/posts/${postId}/save`);
    return normalizePost(response.data?.data?.post);
  },
  hidePost: async (postId, reason = "NOT_USEFUL") => {
    const response = await axiosInstance.post(`/posts/${postId}/hide`, { reason });
    return response.data?.data;
  },
  reportPost: async (postId, payload) => {
    const response = await axiosInstance.post(`/posts/${postId}/report`, payload);
    return response.data?.data;
  },
  blockPostAuthor: async (postId) => {
    const response = await axiosInstance.put(`/posts/${postId}/block-author`);
    return response.data?.data;
  },
  deletePost: async (postId) => axiosInstance.delete(`/posts/${postId}`).then((response) => response.data?.data),
};
