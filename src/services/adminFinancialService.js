import api from "../api/axiosInstance";

export const adminFinancialService = {
  getMonetizationPolicy: () => api.get("/admin/monetization-policy"),
  updateMonetizationPolicy: (payload) => api.put("/admin/monetization-policy", payload),
  listUserWallets: (params = {}) => api.get("/admin/wallets", { params }),
  getPlatformRevenue: () => api.get("/admin/platform-revenue"),
  getExchangeRate: () => api.get("/admin/exchange-rate"),
  updateExchangeRate: (payload) => api.put("/admin/exchange-rate", payload),
  getCoinTaxRate: () => api.get("/admin/coin-tax-rate"),
  updateCoinTaxRate: (payload) => api.put("/admin/coin-tax-rate", payload),
  activateWallet: (userId, payload) => api.post(`/admin/wallets/${userId}/activate-ledger`, payload),
  creditStars: (userId, payload) => api.post(`/admin/wallets/${userId}/credit-stars`, payload),
};
