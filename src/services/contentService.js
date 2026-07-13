import axiosInstance from "../api/axiosInstance";

export const contentService = {
  getFeaturedContent: () => axiosInstance.get("/content"),
  getCreatorContent: (creatorId) => axiosInstance.get(`/content/creator/${creatorId}`),
  getMyContent: () => axiosInstance.get("/content/mine"),
  publishImageContent: (content) => axiosInstance.post("/content/image", content),
  getUploadSignature: () => axiosInstance.post("/content/upload-signature"),
  uploadMedia: async (file) => {
    const response = await axiosInstance.post("/content/upload-signature");
    const upload = response.data.data;
    const formData = new FormData();

    formData.append("file", file);
    formData.append("api_key", upload.apiKey);
    formData.append("timestamp", String(upload.timestamp));
    formData.append("signature", upload.signature);
    formData.append("folder", upload.folder);

    const cloudinaryResponse = await fetch(upload.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!cloudinaryResponse.ok) {
      const error = await cloudinaryResponse.json().catch(() => ({}));
      throw new Error(error.error?.message || "Media upload failed");
    }

    return cloudinaryResponse.json();
  },
};
