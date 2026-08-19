import api from "../api/axiosInstance";

export const adminEmailTemplateService = {
  getWelcome: () => api.get("/admin/email-templates/welcome"),
  updateWelcome: (formData) => api.patch("/admin/email-templates/welcome", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};
