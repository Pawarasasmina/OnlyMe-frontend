import { useEffect, useRef, useState } from "react";
import { FiCamera, FiCheck, FiPause, FiPlay, FiRotateCcw, FiSend, FiSquare, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";

const MAX_DURATION_MS = 60000;
const clock = (milliseconds = 0) => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
const supportedMime = () => ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"].find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";

export default function VideoNoteRecorder({ disabled = false, onSend }) {
  const [mode, setMode] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCurrent, setPreviewCurrent] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const liveVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const previewRef = useRef(null);

  const stopStream = () => {
    window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  const reset = () => {
    stopStream();
    if (previewRef.current?.url) URL.revokeObjectURL(previewRef.current.url);
    previewRef.current = null;
    setPreview(null);
    setElapsed(0);
    setUploadProgress(0);
    setPreviewMuted(false);
    setPreviewPlaying(false);
    setPreviewCurrent(0);
    setPreviewDuration(0);
    setError("");
    setMode("idle");
  };
  useEffect(() => () => {
    discardRef.current = true;
    if (recorderRef.current?.state && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    stopStream();
    if (previewRef.current?.url) URL.revokeObjectURL(previewRef.current.url);
  }, []);

  const openCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Video notes are not supported in this browser.");
      return;
    }
    setMode("opening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 }, aspectRatio: { ideal: 1 } },
      });
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new DOMException("No microphone track was provided", "NotFoundError");
      }
      streamRef.current = stream;
      setMode("ready");
      window.setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
      }, 0);
    } catch (permissionError) {
      setMode("idle");
      if (permissionError.name === "NotAllowedError") setError("Camera or microphone access was denied. Allow both permissions in your browser settings and try again.");
      else if (permissionError.name === "NotFoundError") setError("A front camera and microphone are required to record a video note.");
      else setError("The camera could not be started. Close other camera apps and try again.");
    }
  };
  const record = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = supportedMime();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 1800000 } : undefined);
    chunksRef.current = [];
    discardRef.current = false;
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      stopStream();
      if (discardRef.current) return;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      const item = { blob, url: URL.createObjectURL(blob) };
      previewRef.current = item;
      setPreview(item);
      setPreviewMuted(false);
      setPreviewPlaying(false);
      setPreviewCurrent(0);
      setPreviewDuration(elapsed / 1000);
      setMode("preview");
    };
    recorder.start(250);
    startedAtRef.current = Date.now();
    setElapsed(0);
    setMode("recording");
    timerRef.current = window.setInterval(() => {
      const next = Math.min(MAX_DURATION_MS, Date.now() - startedAtRef.current);
      setElapsed(next);
      if (next >= MAX_DURATION_MS && recorder.state !== "inactive") recorder.stop();
    }, 100);
  };
  const finish = () => {
    if (recorderRef.current?.state && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };
  const cancel = () => {
    discardRef.current = true;
    if (recorderRef.current?.state && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    reset();
  };
  const rerecord = () => {
    if (previewRef.current?.url) URL.revokeObjectURL(previewRef.current.url);
    previewRef.current = null;
    setPreview(null);
    setElapsed(0);
    setPreviewCurrent(0);
    setPreviewDuration(0);
    openCamera();
  };
  const upload = async () => {
    if (!previewRef.current?.blob) return;
    setMode("uploading");
    setUploadProgress(0);
    setError("");
    try {
      await onSend(previewRef.current.blob, setUploadProgress);
      reset();
    } catch (uploadError) {
      setMode("failed");
      setError(uploadError.response?.data?.message || "Video note failed to upload. Retry without recording again.");
    }
  };
  const togglePreviewPlayback = async () => {
    const player = previewVideoRef.current;
    if (!player) return;
    if (player.paused) await player.play().catch(() => {});
    else player.pause();
  };
  const togglePreviewSound = () => {
    const player = previewVideoRef.current;
    if (!player) return;
    const next = !previewMuted;
    player.muted = next;
    setPreviewMuted(next);
    if (player.paused) player.play().catch(() => {});
  };

  if (mode === "idle") return <div className="shrink-0"><button aria-label="Record video note" className="grid h-11 w-11 place-items-center rounded-full border border-atseen-line text-atseen-muted transition hover:border-atseen-blue/50 hover:bg-atseen-blue/10 hover:text-atseen-blue disabled:opacity-40" disabled={disabled} onClick={openCamera} title="Record video note" type="button"><FiCamera /></button>{error ? <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-atseen-danger/20 bg-atseen-bg-2 p-3 text-xs leading-5 text-atseen-danger shadow-xl">{error}<button aria-label="Dismiss camera error" className="float-right ml-2" onClick={() => setError("")} type="button"><FiX /></button></div> : null}</div>;

  const showingCamera = ["opening", "ready", "recording"].includes(mode);
  const reviewing = ["preview", "failed"].includes(mode);
  const ringProgress = mode === "uploading" ? uploadProgress / 100 : reviewing && previewDuration > 0 ? previewCurrent / previewDuration : elapsed / MAX_DURATION_MS;
  const displayedTime = reviewing ? previewCurrent * 1000 : elapsed;
  const displayedLimit = reviewing && previewDuration > 0 ? clock(previewDuration * 1000) : "1:00";
  return <div className="absolute bottom-3 left-3 right-3 z-40 overflow-hidden rounded-[28px] border border-atseen-blue/20 bg-[linear-gradient(145deg,#101722,#080b10)] p-4 shadow-[0_24px_80px_rgba(0,0,0,.7)] sm:bottom-4 sm:left-4 sm:right-auto sm:w-[330px]">
    <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-extrabold">Video note</p><p className="text-[10px] text-atseen-muted">{mode === "recording" ? "Recording with front camera" : mode === "uploading" ? "Sending securely…" : mode === "failed" ? "Upload paused" : showingCamera ? "Camera and microphone ready" : "Review before sending"}</p></div><button aria-label="Cancel video note" className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-atseen-muted hover:text-white" disabled={mode === "uploading"} onClick={cancel} type="button"><FiX /></button></div>
    <div className="relative mx-auto h-52 w-52">
      <div className={`absolute inset-0 rounded-full bg-atseen-blue/20 blur-2xl ${mode === "recording" ? "animate-pulse" : ""}`} />
      <div className={`relative h-full w-full overflow-hidden rounded-full border-[3px] bg-black shadow-2xl ${mode === "recording" ? "border-atseen-danger" : "border-atseen-blue/70"}`}>
        {showingCamera ? <video autoPlay className="h-full w-full scale-x-[-1] object-cover" muted playsInline ref={liveVideoRef} /> : <video className="h-full w-full object-cover" controls={false} key={preview?.url} loop muted={previewMuted} onDurationChange={(event) => setPreviewDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : elapsed / 1000)} onEnded={() => setPreviewPlaying(false)} onLoadedData={(event) => { event.currentTarget.currentTime = 0.001; }} onPause={() => setPreviewPlaying(false)} onPlay={() => setPreviewPlaying(true)} onTimeUpdate={(event) => setPreviewCurrent(event.currentTarget.currentTime)} playsInline preload="auto" ref={previewVideoRef} src={preview?.url} />}
        {mode === "opening" ? <div className="absolute inset-0 grid place-items-center bg-black/75"><span className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-atseen-blue" /></div> : null}
        {mode === "uploading" ? <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[2px]"><div className="text-center"><p className="text-2xl font-black">{uploadProgress}%</p><p className="mt-1 text-[10px] text-white/70">Uploading</p></div></div> : null}
        {!showingCamera && mode !== "uploading" ? <button aria-label={previewPlaying ? "Pause preview" : "Play preview"} className="absolute inset-0 grid place-items-center bg-black/10 transition hover:bg-black/20" onClick={togglePreviewPlayback} type="button"><span className="grid h-12 w-12 place-items-center rounded-full bg-black/55 text-lg text-white shadow-xl backdrop-blur-sm">{previewPlaying ? <FiPause /> : <FiPlay className="ml-1" />}</span></button> : null}
        {!showingCamera && mode !== "uploading" ? <button aria-label={previewMuted ? "Unmute preview" : "Mute preview"} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80" onClick={togglePreviewSound} title={previewMuted ? "Unmute preview" : "Mute preview"} type="button">{previewMuted ? <FiVolumeX /> : <FiVolume2 />}</button> : null}
      </div>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 208 208"><circle cx="104" cy="104" fill="none" r="101" stroke="#9CCBFF" strokeDasharray={2 * Math.PI * 101} strokeDashoffset={(2 * Math.PI * 101) * (1 - ringProgress)} strokeLinecap="round" strokeWidth="4" /></svg>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1 font-mono text-xs font-bold tabular-nums text-white backdrop-blur-sm">{clock(displayedTime)} / {displayedLimit}</span>
    </div>
    <div className="mt-4 flex min-h-12 items-center justify-center gap-3">
      {mode === "ready" ? <button className="grid h-14 w-14 place-items-center rounded-full border-4 border-white bg-atseen-danger text-white shadow-lg transition hover:scale-105" onClick={record} type="button"><span className="sr-only">Start recording</span><span className="h-6 w-6 rounded-full bg-white" /></button> : null}
      {mode === "recording" ? <button aria-label="Finish recording" className="grid h-14 w-14 place-items-center rounded-full bg-atseen-danger text-xl text-white shadow-lg" onClick={finish} type="button"><FiSquare /></button> : null}
      {["preview", "failed"].includes(mode) ? <><button className="flex h-11 items-center gap-2 rounded-full border border-atseen-line px-4 text-xs font-bold text-atseen-muted hover:text-white" onClick={rerecord} type="button"><FiRotateCcw /> Re-record</button><button className="flex h-11 items-center gap-2 rounded-full bg-atseen-blue px-5 text-xs font-extrabold text-atseen-bg shadow-lg shadow-atseen-blue/20" onClick={upload} type="button">{mode === "failed" ? <FiRotateCcw /> : <FiSend />}{mode === "failed" ? "Retry" : "Send"}</button></> : null}
      {mode === "uploading" ? <span className="flex items-center gap-2 text-xs font-bold text-atseen-blue"><FiCheck /> Keep this chat open</span> : null}
    </div>
    {mode === "failed" ? <p className="mt-2 text-center text-[10px] leading-4 text-atseen-danger">{error}</p> : null}
    {mode === "ready" ? <p className="mt-2 text-center text-[10px] text-atseen-muted">Eye to eye — they see you · up to 60 seconds</p> : null}
  </div>;
}
