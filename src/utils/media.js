import { API_ORIGIN } from "../config/api.js";

export function resolveMediaUrl(url) {
  if (!url) {
    return "";
  }

  if (/^(https?:|blob:|data:)/i.test(url)) {
    return url;
  }

  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}
