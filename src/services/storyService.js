import api from "../api/axiosInstance";
export const storyService = {
  getActiveStories: () => api.get("/stories/active").then((response) => response.data.data || []),
  getStory: (storyId) => api.get(`/stories/${storyId}`).then((response) => response.data.data.story),
  createStory: (file, caption, onProgress) => { const body = new FormData(); body.append("image", file); body.append("caption", caption || ""); return api.post("/stories", body, { onUploadProgress: (event) => onProgress?.(event.total ? Math.round(event.loaded * 100 / event.total) : 0) }); },
  markStoryViewed: (storyId) => api.post(`/stories/${storyId}/views`),
  reactToStory: (storyId, reaction) => api.post(`/stories/${storyId}/reactions`, { reaction }),
  replyToStory: (storyId, body) => api.post(`/stories/${storyId}/replies`, { body }),
  deleteStory: (storyId) => api.delete(`/stories/${storyId}`),
};
