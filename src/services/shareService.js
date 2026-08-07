import axiosInstance from "../api/axiosInstance";

export const SHARE_CONTENT_TYPES = ["feed_post", "seen", "world", "experience", "profile", "story"];

export function canonicalShareUrl(payload = {}) {
  const route = payload.destinationRoute || payload.route || "";
  const configuredOrigin = import.meta.env.VITE_APP_ORIGIN || import.meta.env.VITE_PUBLIC_APP_URL || "";
  const origin = configuredOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  if (payload.canonicalUrl) return payload.canonicalUrl;
  if (!origin || !route) return route;
  return `${origin.replace(/\/$/, "")}/${String(route).replace(/^\//, "")}`;
}

export const shareService = {
  getRecipients: (params = {}) => axiosInstance.get("/messages/share/recipients", { params }),
  sendSharedContent: (payload) => axiosInstance.post("/messages/share", payload),
};
