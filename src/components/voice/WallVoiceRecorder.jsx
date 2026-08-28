import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiGlobe, FiMic, FiPause, FiPlay, FiRefreshCw, FiSend, FiSquare, FiTrash2, FiX } from "react-icons/fi";
import FanModal from "../fanWeb/shared/FanModal";
import VoiceMessageBubble from "../messaging/VoiceMessageBubble";
import { formatVoiceTime, useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { voiceService } from "../../services/voiceService";
import { POST_TEXT_MAX_LENGTH, POST_VOICE_NOTE_MAX_SIZE } from "../../data/postOptions";

function extensionForType(type = "") {
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mp4")) return "m4a";
  if (type.includes("mpeg")) return "mp3";
  if (type.includes("wav")) return "wav";
  return "webm";
}

function fileFromBlob(blob) {
  return new File([blob], `wall-voice-note-${Date.now()}.${extensionForType(blob.type)}`, {
    lastModified: Date.now(),
    type: blob.type || "audio/webm",
  });
}

function WaveBars({ active = false, levels = [] }) {
  const bars = levels.length ? levels.slice(-36) : Array.from({ length: 28 }, (_, index) => 0.12 + ((index * 5) % 9) / 18);
  return (
    <div aria-hidden="true" className="flex h-12 min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden rounded-2xl bg-white/[0.035] px-3">
      {bars.map((level, index) => (
        <span
          className={`w-[3px] rounded-full ${active ? "bg-atseen-blue" : "bg-white/25"}`}
          key={`${index}-${Math.round(level * 100)}`}
          style={{ height: `${Math.max(6, Math.round(level * 34))}px` }}
        />
      ))}
    </div>
  );
}

export default function WallVoiceRecorder({ isOpen, onClose, onUse }) {
  const recorder = useVoiceRecorder();
  const { resetRecording } = recorder;
  const [transcript, setTranscript] = useState("");
  const [transcriptStatus, setTranscriptStatus] = useState("idle");
  const [transcriptLanguage, setTranscriptLanguage] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [translationLanguages, setTranslationLanguages] = useState([]);
  const [translationLanguageStatus, setTranslationLanguageStatus] = useState("idle");
  const [translations, setTranslations] = useState({});
  const [translationStatuses, setTranslationStatuses] = useState({});
  const [translationError, setTranslationError] = useState("");
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const languageAbortRef = useRef(null);
  const translationRequestIdsRef = useRef({});
  const translationAbortRefs = useRef({});
  const languageByCode = useMemo(() => new Map(translationLanguages.map((language) => [language.code, language])), [translationLanguages]);

  const languageLabel = useCallback((code) => languageByCode.get(code)?.name || languageByCode.get(code)?.label || code, [languageByCode]);

  const resetTranscript = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    Object.values(translationAbortRefs.current).forEach((controller) => controller?.abort());
    translationAbortRefs.current = {};
    translationRequestIdsRef.current = {};
    setTranscript("");
    setTranscriptStatus("idle");
    setTranscriptLanguage("");
    setConfidence(null);
    setTranscriptionError("");
    setTranslations({});
    setTranslationStatuses({});
    setTranslationError("");
  }, []);

  const close = () => {
    recorder.resetRecording();
    resetTranscript();
    onClose();
  };

  const transcribe = useCallback(async () => {
    if (!recorder.audioBlob) return;
    abortRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    setTranscriptStatus("loading");
    setConfidence(null);
    setTranscriptionError("");
    try {
      const result = await voiceService.transcribeWallVoice(recorder.audioBlob, { signal: controller.signal });
      if (requestIdRef.current !== requestId) return;
      setTranscript(String(result.transcript || "").slice(0, POST_TEXT_MAX_LENGTH));
      if (languageByCode.has(result.detectedLanguage)) {
        setTranscriptLanguage(result.detectedLanguage);
      }
      setConfidence(result.confidence ?? null);
      setTranscriptStatus(result.emptySpeech ? "empty" : "success");
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || requestIdRef.current !== requestId) return;
      const errorCode = error?.response?.data?.code;
      if (errorCode === "TRANSCRIPTION_NOT_CONFIGURED") {
        setTranscriptStatus("not-configured");
        setTranscriptionError("");
      } else {
        setTranscriptStatus("error");
        setTranscriptionError(error?.response?.data?.message || "Couldn't generate a transcript. You can still use the voice note.");
      }
    } finally {
      if (requestIdRef.current === requestId) {
        abortRef.current = null;
      }
    }
  }, [languageByCode, recorder.audioBlob]);

  const loadTranslationLanguages = useCallback(async () => {
    languageAbortRef.current?.abort();
    const controller = new AbortController();
    languageAbortRef.current = controller;
    setTranslationLanguageStatus("loading");
    try {
      const result = await voiceService.getVoiceTranslationLanguages({ signal: controller.signal });
      const languages = (result.languages || [])
        .map((language) => ({
          code: String(language.code || "").trim().toLowerCase(),
          name: String(language.name || language.label || language.code || "").trim(),
        }))
        .filter((language) => language.code && language.name);
      setTranslationLanguages(languages);
      setSelectedLanguage((current) => current || languages[0]?.code || "");
      setTranslationLanguageStatus("success");
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;
      setTranslationLanguageStatus("error");
      setTranslationError(error?.response?.data?.message || "Translation languages are unavailable.");
    } finally {
      if (languageAbortRef.current === controller) {
        languageAbortRef.current = null;
      }
    }
  }, []);

  const translateLanguage = useCallback(async (language, options = {}) => {
    const targetLanguage = language || selectedLanguage;
    const sourceText = transcript.trim();
    if (!sourceText || !targetLanguage || transcriptStatus === "loading") return;

    const cached = translations[targetLanguage];
    if (!options.force && cached?.sourceText === sourceText) {
      setTranslationStatuses((current) => ({ ...current, [targetLanguage]: "success" }));
      setTranslationError("");
      return;
    }

    translationAbortRefs.current[targetLanguage]?.abort();
    const requestId = (translationRequestIdsRef.current[targetLanguage] || 0) + 1;
    translationRequestIdsRef.current[targetLanguage] = requestId;
    const controller = new AbortController();
    translationAbortRefs.current[targetLanguage] = controller;

    setTranslationStatuses((current) => ({ ...current, [targetLanguage]: "loading" }));
    setTranslationError("");

    try {
      const result = await voiceService.translateVoiceTranscript(
        {
          sourceLanguage: transcriptLanguage,
          targetLanguage,
          text: sourceText,
        },
        { signal: controller.signal }
      );

      if (translationRequestIdsRef.current[targetLanguage] !== requestId) return;
      const detectedLanguage = languageByCode.has(result.detectedLanguage) ? result.detectedLanguage : transcriptLanguage;
      if (!transcriptLanguage && detectedLanguage) setTranscriptLanguage(detectedLanguage);
      setTranslations((current) => ({
        ...current,
        [targetLanguage]: {
          detectedLanguage: detectedLanguage || "",
          language: targetLanguage,
          languageName: languageLabel(targetLanguage),
          provider: result.provider || "libretranslate",
          sourceText,
          text: String(result.translatedText || "").slice(0, POST_TEXT_MAX_LENGTH),
        },
      }));
      setTranslationStatuses((current) => ({ ...current, [targetLanguage]: "success" }));
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || translationRequestIdsRef.current[targetLanguage] !== requestId) return;
      setTranslationStatuses((current) => ({ ...current, [targetLanguage]: "error" }));
      setTranslationError(error?.response?.data?.message || "Couldn't translate this transcript.");
    } finally {
      if (translationRequestIdsRef.current[targetLanguage] === requestId) {
        translationAbortRefs.current[targetLanguage] = null;
      }
    }
  }, [languageByCode, languageLabel, selectedLanguage, transcript, transcriptLanguage, transcriptStatus, translations]);

  useEffect(() => {
    if (isOpen) return;
    resetRecording();
    resetTranscript();
  }, [isOpen, resetRecording, resetTranscript]);

  useEffect(() => {
    if (!isOpen) return undefined;
    loadTranslationLanguages();
    return () => languageAbortRef.current?.abort();
  }, [isOpen, loadTranslationLanguages]);

  useEffect(() => {
    resetTranscript();
    if (recorder.status === "preview" && recorder.audioBlob) {
      transcribe();
    }
  }, [recorder.audioBlob, recorder.status, resetTranscript, transcribe]);

  const useRecording = () => {
    if (!recorder.audioBlob) return;
    if (recorder.audioBlob.size > POST_VOICE_NOTE_MAX_SIZE) {
      setTranscriptionError("Voice notes must be 20 MB or smaller.");
      return;
    }
    const sourceText = transcript.trim();
    const translationEntries = Object.values(translations);
    const staleTranslations = translationEntries.filter((translation) => translation.text?.trim() && translation.sourceText !== sourceText);
    if (staleTranslations.length) {
      setTranslationError("Update or remove stale translations before using this recording.");
      return;
    }
    onUse({
      duration: recorder.durationSeconds,
      file: fileFromBlob(recorder.audioBlob),
      mimeType: recorder.audioBlob.type || "audio/webm",
      transcript: sourceText,
      transcriptLanguage,
      translations: translationEntries
        .filter((translation) => translation.text?.trim() && translation.sourceText === sourceText)
        .map((translation) => ({
          language: translation.language,
          languageName: translation.languageName || languageLabel(translation.language),
          sourceText: translation.sourceText,
          text: translation.text.trim(),
        })),
      waveform: recorder.levels,
    });
    close();
  };

  const rerecord = () => {
    recorder.resetRecording();
    resetTranscript();
  };

  const recordingActive = recorder.status === "recording";
  const recordingPaused = recorder.status === "paused";
  const recordingBusy = recorder.status === "requesting-permission" || recorder.status === "stopping";
  const showCapture = recordingActive || recordingPaused || recordingBusy;
  const title = recorder.status === "preview" ? "Review voice note" : "Voice note";
  const transcribing = transcriptStatus === "loading";
  const sourceText = transcript.trim();
  const selectedTranslationStatus = translationStatuses[selectedLanguage] || "idle";
  const translationEntries = Object.values(translations);
  const nextMissingLanguage = translationLanguages.find((language) => !translations[language.code])?.code || "";

  return (
    <FanModal
      className="max-w-md rounded-b-none sm:rounded-[22px]"
      isOpen={isOpen}
      onClose={close}
      overlayClassName="wall-voice-recorder-overlay items-end p-0 sm:items-center sm:p-4"
      title={title}
    >
      {recorder.status === "idle" || recorder.status === "error" ? (
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-atseen-blue/25 bg-atseen-blue/10 text-2xl text-atseen-blue">
            <FiMic aria-hidden="true" />
          </div>
          <p className="mt-4 text-xl font-black text-atseen-text">Voice note</p>
          <p className="mt-1 text-sm text-atseen-muted">Record what you&apos;ve seen</p>
          {recorder.error ? <p className="mt-4 rounded-2xl border border-atseen-danger/20 bg-atseen-danger/10 p-3 text-sm text-atseen-danger">{recorder.error}</p> : null}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button className="rounded-2xl border border-atseen-line px-5 py-3 text-sm font-bold text-atseen-text" onClick={close} type="button">
              Cancel
            </button>
            <button className="rounded-2xl bg-atseen-blue px-6 py-3 text-sm font-black text-atseen-bg" onClick={recorder.startRecording} type="button">
              Start Recording
            </button>
          </div>
        </div>
      ) : null}

      {showCapture ? (
        <div>
          <div className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-white/[0.025] p-3">
            <span className={`h-3 w-3 rounded-full ${recordingActive ? "animate-pulse bg-atseen-danger" : "bg-atseen-warning"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-atseen-text">{recordingPaused ? "Paused" : recordingBusy ? "Preparing" : "Recording"}</p>
              <p aria-live="polite" className="font-mono text-xs tabular-nums text-atseen-muted">{formatVoiceTime(recorder.durationSeconds)}</p>
            </div>
            <button aria-label="Cancel recording" className="grid h-9 w-9 place-items-center rounded-full text-atseen-muted hover:bg-white/5 hover:text-white" onClick={close} type="button">
              <FiX aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <WaveBars active={recordingActive} levels={recorder.levels} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-atseen-line text-sm font-bold text-atseen-text disabled:opacity-50"
              disabled={recordingBusy}
              onClick={recordingPaused ? recorder.resumeRecording : recorder.pauseRecording}
              type="button"
            >
              {recordingPaused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}
              {recordingPaused ? "Resume" : "Pause"}
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-atseen-blue text-sm font-black text-atseen-bg disabled:opacity-50"
              disabled={recordingBusy}
              onClick={recorder.stopRecording}
              type="button"
            >
              <FiSquare aria-hidden="true" />
              Stop
            </button>
          </div>
        </div>
      ) : null}

      {recorder.status === "preview" ? (
        <div>
          <div className="rounded-2xl border border-atseen-line bg-white/[0.025] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-atseen-text">Voice note - {formatVoiceTime(recorder.durationSeconds)}</p>
              <button aria-label="Delete voice note" className="grid h-8 w-8 place-items-center rounded-full text-atseen-danger hover:bg-atseen-danger/10" onClick={rerecord} type="button">
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
            <VoiceMessageBubble audio={{ duration: recorder.durationSeconds, url: recorder.audioUrl, waveform: recorder.levels }} label="Voice note" />
          </div>

          <label className="mt-4 block text-xs font-bold text-atseen-muted">
            Transcript
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-atseen-line bg-atseen-bg p-3 text-sm leading-6 text-white outline-none transition focus:border-atseen-blue"
              maxLength={POST_TEXT_MAX_LENGTH}
              onChange={(event) => {
                setTranscript(event.target.value);
                setTranslationError("");
              }}
              placeholder={transcribing ? "Transcribing voice note..." : "Review or edit the transcript"}
              value={transcript}
            />
          </label>
          {transcribing ? <p className="mt-2 text-xs font-bold text-atseen-blue">Transcribing voice note...</p> : null}
          {transcriptStatus === "empty" ? <p className="mt-2 text-xs text-atseen-muted">No speech was detected. You can still use the voice note.</p> : null}
          {transcriptStatus === "success" && confidence !== null ? <p className="mt-2 text-xs text-atseen-muted">Transcript ready.</p> : null}
          {transcriptStatus === "not-configured" ? <p className="mt-2 text-xs text-atseen-muted">Transcription is not configured yet. You can still use the voice note.</p> : null}
          {transcriptionError ? (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-atseen-danger/20 bg-atseen-danger/10 p-3 text-xs text-atseen-danger">
              <span>{transcriptionError}</span>
              <button className="font-black text-atseen-blue" onClick={transcribe} type="button">Retry transcription</button>
            </div>
          ) : null}

          <section aria-label="Transcript translations" className="mt-4 rounded-2xl border border-atseen-line bg-white/[0.025] p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-black text-atseen-text">
              <FiGlobe aria-hidden="true" />
              Translations
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block text-xs font-bold text-atseen-muted">
                Translate to
                <select
                  className="mt-2 min-h-11 w-full rounded-xl border border-atseen-line bg-atseen-bg px-3 text-sm font-bold text-white outline-none transition focus:border-atseen-blue"
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  value={selectedLanguage}
                >
                  <option value="">Select language</option>
                  {translationLanguages.map((language) => (
                    <option key={language.code} value={language.code}>{language.name}</option>
                  ))}
                </select>
              </label>
              <button
                aria-label="Translate transcript"
                className="inline-flex min-h-11 items-center justify-center self-end rounded-xl bg-atseen-blue px-4 text-sm font-black text-atseen-bg disabled:opacity-50"
                disabled={!sourceText || !selectedLanguage || transcribing || selectedTranslationStatus === "loading" || translationLanguageStatus !== "success"}
                onClick={() => translateLanguage(selectedLanguage)}
                type="button"
              >
                {selectedTranslationStatus === "loading" ? "Translating..." : translations[selectedLanguage]?.sourceText === sourceText ? "Use cached" : "Translate"}
              </button>
            </div>
            <p aria-live="polite" className="mt-2 min-h-4 text-xs text-atseen-muted">
              {translationLanguageStatus === "loading" ? "Loading translation languages..." : translationLanguageStatus === "error" ? "Translation languages are unavailable." : selectedTranslationStatus === "error" ? "Couldn't translate this transcript." : selectedTranslationStatus === "loading" ? "Translating..." : ""}
            </p>
            {translationError ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-atseen-danger/20 bg-atseen-danger/10 p-3 text-xs text-atseen-danger">
                <span>{translationError}</span>
                {selectedLanguage ? <button className="font-black text-atseen-blue" onClick={() => translateLanguage(selectedLanguage, { force: true })} type="button">Retry</button> : null}
              </div>
            ) : null}

            {translationEntries.length ? (
              <div className="mt-3 grid gap-3">
                {translationEntries.map((translation) => {
                  const label = translation.languageName || languageLabel(translation.language);
                  const stale = translation.sourceText !== sourceText;
                  const status = translationStatuses[translation.language] || "success";
                  return (
                    <article className={`rounded-xl border p-3 ${stale ? "border-atseen-warning/30 bg-atseen-warning/10" : "border-white/[0.06] bg-atseen-bg"}`} key={translation.language}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-atseen-text">{label}</p>
                          <p className="text-[11px] text-atseen-muted">{stale ? "Original changed - update before publishing" : `Translated to ${label}`}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button className="text-[11px] font-black text-atseen-blue disabled:opacity-50" disabled={status === "loading" || !sourceText} onClick={() => translateLanguage(translation.language, { force: true })} type="button">
                            {status === "loading" ? "Translating..." : stale ? "Update" : "Translate again"}
                          </button>
                          <button
                            aria-label={`Remove ${label} translation`}
                            className="grid h-7 w-7 place-items-center rounded-full text-atseen-danger hover:bg-atseen-danger/10"
                            onClick={() => {
                              translationAbortRefs.current[translation.language]?.abort();
                              setTranslations((current) => {
                                const next = { ...current };
                                delete next[translation.language];
                                return next;
                              });
                              setTranslationStatuses((current) => {
                                const next = { ...current };
                                delete next[translation.language];
                                return next;
                              });
                            }}
                            type="button"
                          >
                            <FiX aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <label className="block text-[11px] font-bold text-atseen-muted">
                        Translation text
                        <textarea
                          className="mt-1 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-white/[0.025] p-3 text-sm leading-6 text-white outline-none transition focus:border-atseen-blue"
                          maxLength={POST_TEXT_MAX_LENGTH}
                          onChange={(event) => {
                            const nextText = event.target.value;
                            setTranslations((current) => ({
                              ...current,
                              [translation.language]: {
                                ...(current[translation.language] || translation),
                                text: nextText,
                              },
                            }));
                          }}
                          value={translation.text}
                        />
                      </label>
                    </article>
                  );
                })}
              </div>
            ) : null}
            {nextMissingLanguage ? (
              <button className="mt-3 text-xs font-black text-atseen-blue" onClick={() => setSelectedLanguage(nextMissingLanguage)} type="button">
                + Add another language
              </button>
            ) : null}
          </section>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-atseen-line px-4 text-sm font-bold text-atseen-text" onClick={rerecord} type="button">
              <FiRefreshCw aria-hidden="true" /> Re-record
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-atseen-danger/25 px-4 text-sm font-bold text-atseen-danger" onClick={close} type="button">
              <FiTrash2 aria-hidden="true" /> Delete
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-atseen-blue px-5 text-sm font-black text-atseen-bg" onClick={useRecording} type="button">
              <FiSend aria-hidden="true" /> Use Recording
            </button>
          </div>
        </div>
      ) : null}
    </FanModal>
  );
}
