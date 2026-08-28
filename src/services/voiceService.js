import api from "../api/axiosInstance";

function extensionForType(type = "") {
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mp4")) return "m4a";
  if (type.includes("mpeg")) return "mp3";
  if (type.includes("wav")) return "wav";
  return "webm";
}

export const voiceService = {
  getVoiceTranslationLanguages: async (options = {}) => {
    const response = await api.get("/voice/translation-languages", { signal: options.signal });
    return response.data?.data || {};
  },
  transcribeWallVoice: async (blob, options = {}) => {
    const body = new FormData();
    body.append("audio", blob, `wall-voice-note.${extensionForType(blob?.type)}`);
    const response = await api.post("/voice/transcribe", body, { signal: options.signal });
    return response.data?.data || {};
  },
  translateVoiceTranscript: async ({ sourceLanguage = "", targetLanguage, text }, options = {}) => {
    const response = await api.post(
      "/voice/translate",
      {
        text,
        targetLanguage,
        ...(sourceLanguage ? { sourceLanguage } : {}),
      },
      { signal: options.signal }
    );
    return response.data?.data || {};
  },
};
