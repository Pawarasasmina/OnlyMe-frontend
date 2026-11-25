import api from "../api/axiosInstance";
export const businessService = {
  verification: () => api.get("/business/verification").then(r => r.data.data),
  submit: payload => api.post("/business/verification", payload).then(r => r.data.data),
  bookings: () => api.get("/business/bookings").then(r => r.data.data),
  request: payload => api.post("/business/bookings", payload).then(r => r.data.data),
  updateBooking: (id, status) => api.patch(`/business/bookings/${id}`, { status }),
  dispute: (id, reason) => api.post(`/business/bookings/${id}/dispute`, { reason }),
  applications: status => api.get("/admin/business-verifications", { params: { status } }).then(r => r.data.data),
  offers: () => api.get("/admin/business-offers").then(r=>r.data.data),
  moderateOffer: (id, payload) => api.post(`/admin/business-offers/${id}/review`, payload),
  review: (id, payload) => api.post(`/admin/business-verifications/${id}/review`, payload),
  document: id => api.get(`/admin/business-verifications/${id}/document`, { responseType: "blob" }),
  inbox: resolved => api.get("/admin/support-inbox", { params: { resolved } }).then(r => r.data.data),
  resolve: (id, resolution) => api.post(`/admin/support-inbox/${id}/resolve`, { resolution }),
};
