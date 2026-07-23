import { useEffect, useRef, useState } from "react";
import { FiMic, FiPause, FiPlay, FiRotateCcw, FiSend, FiSquare, FiTrash2, FiX } from "react-icons/fi";
import VoiceMessageBubble from "./VoiceMessageBubble";

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

export default function VoiceRecorder({ disabled = false, onSend }) {
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
      setError("Voice recording is not supported in this browser.");
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
        if (elapsedRef.current >= 300000) recorder.stop();
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
      setError(permissionError.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access in your browser settings and try again." : "The microphone could not be started.");
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
      setError(uploadError.response?.data?.message || "Voice message failed to upload. You can retry without recording again.");
    }
  };

  if (mode === "idle") return <div className="shrink-0"><button aria-label="Record voice message" className="grid h-11 w-11 place-items-center rounded-full border border-atseen-line text-atseen-muted transition hover:border-atseen-blue/50 hover:text-atseen-blue disabled:opacity-40" disabled={disabled} onClick={begin} title="Record voice message" type="button"><FiMic /></button>{error ? <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-atseen-danger/20 bg-atseen-bg-2 p-3 text-xs text-atseen-danger shadow-xl">{error}<button aria-label="Dismiss microphone error" className="float-right" onClick={() => setError("")} type="button"><FiX /></button></div> : null}</div>;

  if (["recording", "paused"].includes(mode)) return <div className="absolute inset-x-3 bottom-3 z-30 flex min-h-12 items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-bg-2 px-3 py-2 shadow-2xl sm:inset-x-4 sm:bottom-4">
    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${mode === "recording" ? "animate-pulse bg-atseen-danger" : "bg-atseen-warning"}`} />
    <span className="w-10 shrink-0 font-mono text-xs font-bold tabular-nums">{clock(elapsed)}</span>
    <div className="flex h-7 min-w-0 flex-1 items-center gap-[2px] overflow-hidden">{(levels.length ? levels : Array(24).fill(0.1)).slice(-30).map((level, index) => <span className="w-[2px] flex-1 rounded-full bg-atseen-blue" key={index} style={{ height: `${Math.max(3, level * 25)}px` }} />)}</div>
    <button aria-label={mode === "paused" ? "Resume recording" : "Pause recording"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-atseen-line" onClick={togglePause} type="button">{mode === "paused" ? <FiPlay /> : <FiPause />}</button>
    <button aria-label="Finish recording" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-atseen-blue text-atseen-bg" onClick={finish} type="button"><FiSquare /></button>
    <button aria-label="Cancel recording" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-atseen-danger hover:bg-atseen-danger/10" onClick={cancel} type="button"><FiTrash2 /></button>
  </div>;

  return <div className="absolute inset-x-3 bottom-3 z-30 rounded-2xl border border-atseen-line bg-atseen-bg-2 p-3 shadow-2xl sm:inset-x-4 sm:bottom-4">
    <div className="flex items-center gap-3"><div className="min-w-0 flex-1 rounded-xl bg-atseen-surface-2 px-3 py-2"><VoiceMessageBubble audio={{ url: preview?.url, duration: elapsed / 1000, waveform: levels }} /></div><button aria-label="Discard recording" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-atseen-danger hover:bg-atseen-danger/10" disabled={mode === "uploading"} onClick={clearPreview} type="button"><FiTrash2 /></button><button aria-label={mode === "failed" ? "Retry voice upload" : "Send voice message"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-50" disabled={mode === "uploading"} onClick={upload} type="button">{mode === "uploading" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-atseen-bg/30 border-t-atseen-bg" /> : mode === "failed" ? <FiRotateCcw /> : <FiSend />}</button></div>
    <div className="mt-2 flex items-center justify-between text-[10px] text-atseen-muted"><span>{mode === "uploading" ? "Uploading voice message…" : mode === "failed" ? error : `Preview · ${clock(elapsed)}`}</span>{mode === "failed" ? <button className="font-bold text-atseen-blue" onClick={upload} type="button">Retry upload</button> : null}</div>
  </div>;
}
