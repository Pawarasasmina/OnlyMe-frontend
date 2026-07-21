import api from "../api/axiosInstance";

export const adminFinancialService = {
  listFanWallets: (params = {}) => api.get("/admin/wallets", { params }),
  activateWallet: (userId, payload) => api.post(`/admin/wallets/${userId}/activate-ledger`, payload),
  creditStars: (userId, payload) => api.post(`/admin/wallets/${userId}/credit-stars`, payload),
  refundWorldEntitlement: (id, payload) => api.post(`/admin/world-entitlements/${id}/refund`, payload),
  refundPremiumMembership: (id, payload) => api.post(`/admin/premium-memberships/${id}/refund-current-period`, payload),
};
