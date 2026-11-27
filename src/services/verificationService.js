import axiosInstance from "../api/axiosInstance";
import { API_BASE_URL } from "../config/api.js";

async function uploadVerificationDocument(documentType, file) {
  const formData = new FormData();
  formData.append("document", file, file.name);
  const response = await fetch(`${API_BASE_URL}/creator/verification/upload/${encodeURIComponent(documentType)}`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Verification document upload failed");
    error.response = { status: response.status, data };
    throw error;
  }
  return { data };
}

export const verificationService = {
  getMine: () => axiosInstance.get("/creator/verification"),
  saveDraft: (payload) => axiosInstance.put("/creator/verification/draft", payload),
  saveSellerInformation: (payload) => axiosInstance.put("/creator/verification/seller-information", payload),
  saveIdentityDraft: (payload) => axiosInstance.put("/creator/verification/identity/draft", payload),
  uploadDocument: (documentType, file) => uploadVerificationDocument(documentType, file),
  deleteDocument: (documentType) => axiosInstance.delete(`/creator/verification/upload/${documentType}`),
  submit: () => axiosInstance.post("/creator/verification/submit"),
  resubmit: () => axiosInstance.post("/creator/verification/resubmit"),
  getDocument: (documentType) => axiosInstance.get(`/creator/verification/document/${documentType}`, { responseType: "blob" }),
};
