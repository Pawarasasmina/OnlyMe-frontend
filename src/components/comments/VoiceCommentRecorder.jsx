import { useEffect, useState } from "react";
import { FiMic, FiSquare, FiX } from "react-icons/fi";
import { formatVoiceTime, useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { voiceService } from "../../services/voiceService";

const MAX_SECONDS = 30;

export default function VoiceCommentRecorder({ busy = false, onClose, onSubmit }) {
  const recorder = useVoiceRecorder({ maxDurationSeconds: MAX_SECONDS });
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const recording = recorder.status === "recording" || recorder.status === "requesting-permission";
  const canSubmit = Boolean(recorder.audioBlob) && !busy && !recording;
  const { startRecording } = recorder;

  useEffect(() => {
    startRecording();
  }, [startRecording]);

  useEffect(() => {
    if (!recorder.audioBlob) return undefined;
    const controller = new AbortController();
    setTranscribing(true);
    voiceService.transcribeWallVoice(recorder.audioBlob, { signal: controller.signal })
      .then((result) => setTranscript(String(result.transcript || "").trim()))
      .catch((error) => {
        if (error.name !== "CanceledError" && error.name !== "AbortError") setTranscript("");
      })
      .finally(() => {
        if (!controller.signal.aborted) setTranscribing(false);
      });
    return () => controller.abort();
  }, [recorder.audioBlob]);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      audioBlob: recorder.audioBlob,
      durationSeconds: recorder.durationSeconds,
      text: transcript,
      waveform: recorder.levels,
    });
  };

  const close = () => {
    recorder.resetRecording();
    onClose();
  };

  return (
    <div aria-modal="true" className="voice-comment-layer" role="dialog">
      <button aria-label="Cancel voice comment" className="voice-comment-dim" onClick={close} type="button" />
      <section className="voice-comment-sheet">
        <i aria-hidden="true" className="voice-comment-grab" />
        <button aria-label="Close voice comment" className="voice-comment-close" disabled={busy} onClick={close} type="button"><FiX /></button>
        <button
          aria-label={recording ? "Finish voice comment" : "Record voice comment"}
          className={`voice-comment-record ${recording ? "is-recording" : ""}`}
          disabled={busy || recorder.status === "stopping"}
          onClick={recording ? recorder.stopRecording : recorder.startRecording}
          type="button"
        >
          {recording ? <FiSquare /> : <FiMic />}
        </button>
        <h2>Voice comment</h2>
        <p>{recording ? `${formatVoiceTime(recorder.durationSeconds)} of 00:30` : transcribing ? "Writing the text for you..." : "Up to 30 seconds - we'll write the text for you"}</p>
        {recorder.audioUrl ? <audio controls preload="metadata" src={recorder.audioUrl} /> : null}
        {transcript ? <textarea aria-label="Voice comment text" maxLength={500} onChange={(event) => setTranscript(event.target.value)} value={transcript} /> : null}
        {recorder.error ? <small className="voice-comment-error">{recorder.error}</small> : null}
        <button className="voice-comment-done" disabled={!canSubmit} onClick={submit} type="button">{busy ? "Posting..." : "Done"}</button>
        <button className="voice-comment-cancel" disabled={busy} onClick={close} type="button">Cancel</button>
      </section>
    </div>
  );
}
