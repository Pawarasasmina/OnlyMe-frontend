import axiosInstance from "../api/axiosInstance";

function unpack(response) {
  return response.data?.data || {};
}

export const searchService = {
  search: (params, signal) => axiosInstance.get("/search", { params, signal }).then(unpack),
  getSearchDefaults: (signal) => axiosInstance.get("/search/defaults", { signal }).then(unpack),
  getSuggestions: (q, signal) => axiosInstance.get("/search/suggestions", { params: { q }, signal }).then(unpack),
  getRecentSearches: (signal) => axiosInstance.get("/search/recent", { signal }).then((response) => unpack(response).recent || []),
  removeRecentSearch: (id) => axiosInstance.delete(`/search/recent/${id}`).then(unpack),
  clearRecentSearches: () => axiosInstance.delete("/search/recent").then(unpack),
  getTrendingSearches: (signal) => axiosInstance.get("/search/trending", { signal }).then((response) => unpack(response).trending || []),
};
