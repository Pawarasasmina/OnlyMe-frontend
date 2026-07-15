import axiosInstance from "../api/axiosInstance";

export const contentService = {
  getFeaturedContent: (params) => axiosInstance.get("/content", { params }),
  getCreatorContent: (creatorId, params) => axiosInstance.get(`/content/creator/${creatorId}`, { params }),
  listMyContent: (params) => axiosInstance.get("/content/mine", { params }),
  getMyContent: (id) => axiosInstance.get(`/content/mine/${id}`),
  createDraft: (content) => axiosInstance.post("/content/draft", content),
  updateDraft: (id, content) => axiosInstance.put(`/content/${id}`, content),
  requestUploadContract: (contentId) => axiosInstance.post("/content/upload-signature", { contentId }),
  submitForReview: (id) => axiosInstance.post(`/content/${id}/submit`),
  resubmitForReview: (id) => axiosInstance.post(`/content/${id}/resubmit`),
  archiveContent: (id) => axiosInstance.post(`/content/${id}/archive`),
  uploadDraftMedia: async (file, upload, onProgress) => {
    if (upload.maxFileSize && file.size > upload.maxFileSize) {
      const error = new Error(`File exceeds the ${Math.round(upload.maxFileSize / 1024 / 1024)} MB upload limit`);
      error.code = "FILE_TOO_LARGE";
      throw error;
    }
    const formData = new FormData();
    formData.append("file", file);
    onProgress?.(10);
    const response = await axiosInstance.post(upload.uploadUrl, formData, {
      onUploadProgress: (event) => onProgress?.(event.total ? Math.round((event.loaded * 90) / event.total) : 10),
    });
    onProgress?.(100);
    return { public_id: response.data.data.assetId };
  },
};
