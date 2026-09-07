import axiosInstance from "../api/axiosInstance";

function unpack(response) {
  return response.data?.data || {};
}

export const contentEntityService = {
  detail: (type, id) => axiosInstance.get(`/content-entities/${encodeURIComponent(type)}/${encodeURIComponent(id)}`).then(unpack),
  search: ({ q, type, limit = 8 }, signal) => axiosInstance.get("/content-entities/search", {
    params: { limit, q, type },
    signal,
  }).then(unpack),
};
