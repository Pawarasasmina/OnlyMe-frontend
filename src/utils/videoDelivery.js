export const VIDEO_DATA_SAVER_KEY = "atseen_video_data_saver";
export const VIDEO_DATA_SAVER_EVENT = "atseen:video-data-saver";

export function readVideoDataSaver() {
  try { return localStorage.getItem(VIDEO_DATA_SAVER_KEY) === "true"; } catch { return false; }
}

export function writeVideoDataSaver(enabled) {
  try { localStorage.setItem(VIDEO_DATA_SAVER_KEY, String(Boolean(enabled))); } catch { /* The current session still updates. */ }
  window.dispatchEvent(new CustomEvent(VIDEO_DATA_SAVER_EVENT, { detail: Boolean(enabled) }));
}
