import axiosInstance from "../api/axiosInstance";

export const verificationService = {
  getMine: () => axiosInstance.get("/creator/verification"),
  saveDraft: (payload) => axiosInstance.put("/creator/verification/draft", payload),
  uploadDocument: (documentType, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("document", file);
    return axiosInstance.post(`/creator/verification/upload/${documentType}`, formData, { onUploadProgress });
  },
  deleteDocument: (documentType) => axiosInstance.delete(`/creator/verification/upload/${documentType}`),
  submit: () => axiosInstance.post("/creator/verification/submit"),
  resubmit: () => axiosInstance.post("/creator/verification/resubmit"),
  getDocument: (documentType) => axiosInstance.get(`/creator/verification/document/${documentType}`, { responseType: "blob" }),
};
