import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMic, FiRotateCcw, FiSend, FiTrash2, FiX } from "react-icons/fi";
import VoiceMessageBubble from "./VoiceMessageBubble";
import VideoNoteRecorder from "./VideoNoteRecorder";

const clock = (milliseconds = 0) => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const supportedMime = () => [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/webm",
].find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";

export default function VoiceRecorder({ compact = false, disabled = false, onSend }) {
  __useUiLanguage();
  const [mode, setMode] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const frameRef = useRef(null);
  const audioContextRef = useRef(null);
  const discardRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastBlobRef = useRef(null);

  const cleanupCapture = () => {
    window.clearInterval(timerRef.current);
    cancelAnimationFrame(frameRef.current);
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  const clearPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    lastBlobRef.current = null;
    setLevels([]);
    setElapsed(0);
    elapsedRef.current = 0;
    setMode("idle");
    setError("");
  };
  useEffect(() => () => {
    discardRef.current = true;
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    cleanupCapture();
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview?.url]);

  const begin = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(__msg("messaging.voiceRecordingIsNotSupportedInThisBrowser"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      discardRef.current = false;
      elapsedRef.current = 0;
      setElapsed(0);
      setLevels([]);
      const mimeType = supportedMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        cleanupCapture();
        if (discardRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        lastBlobRef.current = blob;
        setPreview({ blob, url });
        setMode("preview");
      };
      recorder.start(250);
      setMode("recording");
      timerRef.current = window.setInterval(() => {
        if (recorder.state !== "recording") return;
        elapsedRef.current += 100;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= 60000) recorder.stop();
      }, 100);
      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      let frames = 0;
      const measure = () => {
        analyser.getByteFrequencyData(samples);
        if (frames++ % 6 === 0 && recorder.state === "recording") {
          const average = samples.reduce((sum, value) => sum + value, 0) / samples.length / 255;
          setLevels((current) => [...current.slice(-35), Math.max(0.08, Math.min(1, average * 2.4))]);
        }
        if (recorder.state !== "inactive") frameRef.current = requestAnimationFrame(measure);
        else {
          context.close().catch(() => {});
          audioContextRef.current = null;
        }
      };
      measure();
    } catch (permissionError) {
      setMode("idle");
      setError(permissionError.name === "NotAllowedError" ? __msg("messaging.microphonePermissionWasDeniedAllowMicrophoneAccessIn") : __msg("useVoiceRecorder.theMicrophoneCouldNotBeStarted"));
    }
  };
  const togglePause = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") { recorder.pause(); setMode("paused"); }
    else if (recorder?.state === "paused") { recorder.resume(); setMode("recording"); }
  };
  const finish = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "paused") recorder.resume();
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };
  const cancel = () => {
    discardRef.current = true;
    const recorder = recorderRef.current;
    if (recorder?.state === "paused") recorder.resume();
    if (recorder && recorder.state !== "inactive") recorder.stop();
    cleanupCapture();
    clearPreview();
  };
  const upload = async () => {
    if (!lastBlobRef.current) return;
    setMode("uploading");
    setError("");
    try {
      await onSend(lastBlobRef.current, levels.length ? levels : [0.2, 0.35, 0.5, 0.3, 0.6, 0.4]);
      clearPreview();
    } catch (uploadError) {
      setMode("failed");
      setError(uploadError.response?.data?.message || __msg("messaging.voiceMessageFailedToUploadYouCanRetry"));
    }
  };

  if (mode === "idle") return <><div className="shrink-0"><button aria-label={__msg("messaging.recordVoiceMessage")} className={compact ? "grid h-8 w-8 place-items-center rounded-full text-atseen-muted transition hover:bg-white/5 hover:text-atseen-blue disabled:opacity-40" : "grid h-11 w-11 place-items-center rounded-full border border-atseen-line text-atseen-muted transition hover:border-atseen-blue/50 hover:text-atseen-blue disabled:opacity-40"} disabled={disabled} onClick={begin} title={__msg("messaging.recordVoiceMessage")} type="button"><FiMic /></button>{error ? <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-atseen-danger/20 bg-atseen-bg-2 p-3 text-xs text-atseen-danger shadow-xl">{__systemMessage(error)}<button aria-label={__msg("messaging.dismissMicrophoneError")} className="float-right" onClick={() => setError("")} type="button"><FiX /></button></div> : null}</div><VideoNoteRecorder compact={compact} disabled={disabled} onSend={(blob, onProgress) => onSend(blob, onProgress, "video")} /></>;

  if (["recording", "paused"].includes(mode)) return createPortal(<div className="fixed inset-0 z-[500] flex justify-center bg-black/80 backdrop-blur-[2px]" role="presentation">
    <section aria-label={__msg("messaging.recordVoiceMessage")} aria-modal="true" className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden border-x border-white/10 bg-[#080b0f]/95 text-white shadow-[0_0_70px_rgba(0,0,0,.7)] max-[480px]:border-x-0" role="dialog">
      <button className="absolute right-5 top-[max(18px,env(safe-area-inset-top))] z-10 px-1 py-2 text-[13px] font-medium text-white/60 transition hover:text-white" onClick={cancel} type="button">{__msg("admin.cancel")}</button>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-[max(44px,env(safe-area-inset-bottom))] pt-16 text-center">
        <h2 className="text-[21px] font-black tracking-[-0.03em]">Voice message</h2>
        <p className="mt-1 text-[12px] text-white/45">Tap to record · up to 60s</p>
        <div aria-hidden="true" className="mt-8 flex h-7 w-[168px] items-center justify-center gap-[3px] overflow-hidden">
          {(levels.length ? levels : Array.from({ length: 28 }, (_, index) => 0.16 + ((index * 7) % 8) * 0.055)).slice(-30).map((level, index) => <span className="w-[3px] shrink-0 rounded-full bg-atseen-blue transition-[height] duration-100" key={index} style={{ height: `${Math.max(5, level * 28)}px` }} />)}
        </div>
        <time className="mt-7 text-[28px] font-black tabular-nums tracking-[-0.04em]">{clock(elapsed)}</time>
        <button aria-label={__msg("messaging.finishRecording")} className="mt-6 grid h-[88px] w-[88px] place-items-center rounded-full bg-[#8fc5ff] text-[27px] text-[#07101a] shadow-[0_14px_40px_rgba(85,165,255,.18)] transition active:scale-95" onClick={finish} type="button"><FiMic /></button>
        <button className="mt-4 min-h-8 px-3 text-[11px] font-semibold text-white/35 transition hover:text-white/70" onClick={togglePause} type="button">{mode === "paused" ? __msg("messaging.resumeRecording") : __msg("messaging.pauseRecording")}</button>
        <p className="mt-9 text-[11px] text-white/35">Voice keeps it human — fans hear you.</p>
      </div>
    </section>
  </div>, document.body);

  return <div className="absolute inset-x-3 bottom-3 z-30 rounded-2xl border border-atseen-line bg-atseen-bg-2 p-3 shadow-2xl sm:inset-x-4 sm:bottom-4">
    <div className="flex items-center gap-3"><div className="min-w-0 flex-1 rounded-xl bg-atseen-surface-2 px-3 py-2"><VoiceMessageBubble audio={{ url: preview?.url, duration: elapsed / 1000, waveform: levels }} /></div><button aria-label={__msg("messaging.discardRecording")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-atseen-danger hover:bg-atseen-danger/10" disabled={mode === "uploading"} onClick={clearPreview} type="button"><FiTrash2 /></button><button aria-label={mode === "failed" ? __msg("messaging.retryVoiceUpload") : __msg("messaging.sendVoiceMessage")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-50" disabled={mode === "uploading"} onClick={upload} type="button">{mode === "uploading" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-atseen-bg/30 border-t-atseen-bg" /> : mode === "failed" ? <FiRotateCcw /> : <FiSend />}</button></div>
    <div className="mt-2 flex items-center justify-between text-[10px] text-atseen-muted"><span>{mode === "uploading" ? __msg("messaging.uploadingVoiceMessage") : mode === "failed" ? error : __msg("messaging.preview", { value0: clock(elapsed) })}</span>{mode === "failed" ? <button className="font-bold text-atseen-blue" onClick={upload} type="button">{__msg("messaging.retryUpload")}</button> : null}</div>
  </div>;
}
