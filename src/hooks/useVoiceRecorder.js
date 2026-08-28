import { useCallback, useEffect, useRef, useState } from "react";
import { POST_VOICE_NOTE_MAX_DURATION_SECONDS } from "../data/postOptions";

const mimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

export function getSupportedAudioMimeType(mediaRecorder = typeof window !== "undefined" ? window.MediaRecorder : null) {
  if (!mediaRecorder) return "";
  if (typeof mediaRecorder.isTypeSupported !== "function") return "";
  return mimeTypes.find((type) => mediaRecorder.isTypeSupported(type)) || "";
}

function microphoneErrorMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Microphone access is blocked. Please allow microphone permission in your browser settings and try again.";
  }
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return "No microphone was detected.";
  }
  return "The microphone could not be started.";
}

export function formatVoiceTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function useVoiceRecorder({ maxDurationSeconds = POST_VOICE_NOTE_MAX_DURATION_SECONDS } = {}) {
  const [status, setStatus] = useState("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeStartedAtRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const discardRef = useRef(false);
  const audioUrlRef = useRef("");

  const clearTimer = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const cleanupCapture = useCallback(() => {
    clearTimer();
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, [clearTimer]);

  const revokePreview = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
  }, []);

  const resetRecording = useCallback(() => {
    discardRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      if (recorder.state === "paused") recorder.resume();
      recorder.stop();
    }
    cleanupCapture();
    revokePreview();
    chunksRef.current = [];
    recorderRef.current = null;
    accumulatedMsRef.current = 0;
    activeStartedAtRef.current = 0;
    setAudioBlob(null);
    setAudioUrl("");
    setElapsedMs(0);
    setError("");
    setLevels([]);
    setStatus("idle");
  }, [cleanupCapture, revokePreview]);

  const startTimer = useCallback(() => {
    clearTimer();
    activeStartedAtRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const next = accumulatedMsRef.current + (Date.now() - activeStartedAtRef.current);
      setElapsedMs(next);
      if (next >= maxDurationSeconds * 1000) {
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
          setStatus("stopping");
          recorder.stop();
        }
      }
    }, 250);
  }, [clearTimer, maxDurationSeconds]);

  const beginLevelMeter = useCallback((stream) => {
    if (typeof AudioContext !== "function") return;
    const context = new AudioContext();
    audioContextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const measure = () => {
      analyser.getByteFrequencyData(samples);
      const recorder = recorderRef.current;
      if (frame++ % 5 === 0 && recorder?.state === "recording") {
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length / 255;
        setLevels((current) => [...current.slice(-39), Math.max(0.08, Math.min(1, average * 2.5))]);
      }
      if (recorder && recorder.state !== "inactive") animationRef.current = requestAnimationFrame(measure);
    };
    measure();
  }, []);

  const startRecording = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatus("error");
      setError("Voice recording isn't supported by this browser.");
      return;
    }

    revokePreview();
    setAudioBlob(null);
    setAudioUrl("");
    setLevels([]);
    setElapsedMs(0);
    accumulatedMsRef.current = 0;
    chunksRef.current = [];
    discardRef.current = false;
    setStatus("requesting-permission");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        cleanupCapture();
        if (discardRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (!blob.size) {
          setStatus("error");
          setError("The recording was empty. Please try again.");
          return;
        }
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioBlob(blob);
        setAudioUrl(url);
        setStatus("preview");
      };
      recorder.start(250);
      setStatus("recording");
      startTimer();
      beginLevelMeter(stream);
    } catch (recordingError) {
      cleanupCapture();
      setStatus("error");
      setError(microphoneErrorMessage(recordingError));
    }
  }, [beginLevelMeter, cleanupCapture, revokePreview, startTimer]);

  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "recording") return;
    accumulatedMsRef.current += Date.now() - activeStartedAtRef.current;
    clearTimer();
    recorder.pause();
    setStatus("paused");
  }, [clearTimer]);

  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "paused") return;
    recorder.resume();
    setStatus("recording");
    startTimer();
  }, [startTimer]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (recorder.state === "recording") {
      accumulatedMsRef.current += Date.now() - activeStartedAtRef.current;
      setElapsedMs(accumulatedMsRef.current);
    }
    setStatus("stopping");
    clearTimer();
    if (recorder.state === "paused") recorder.resume();
    recorder.stop();
  }, [clearTimer]);

  useEffect(() => () => resetRecording(), [resetRecording]);

  return {
    audioBlob,
    audioUrl,
    durationSeconds: elapsedMs / 1000,
    elapsedMs,
    error,
    levels,
    pauseRecording,
    resetRecording,
    resumeRecording,
    startRecording,
    status,
    stopRecording,
  };
}
