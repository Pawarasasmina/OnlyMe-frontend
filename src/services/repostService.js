import axiosInstance from "../api/axiosInstance";

export const repostService = {
  toggle(kind, id, targetModel) {
    return axiosInstance.put(`/reposts/${kind}/${id}`, targetModel ? { targetModel } : {});
  },
};
