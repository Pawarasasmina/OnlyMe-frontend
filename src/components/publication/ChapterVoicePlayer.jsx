import { useRef, useState } from "react";
import { FiPause, FiPlay } from "react-icons/fi";

function formatDuration(seconds = 0) {
  const numeric = Number(seconds);
  const rounded = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function ChapterVoicePlayer({ duration = 0, transcript = "", url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [measuredDuration, setMeasuredDuration] = useState(Number(duration) || 0);
  const [elapsed, setElapsed] = useState(0);

  const measureDuration = (audio) => {
    const nextDuration = Number(audio.duration);
    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setMeasuredDuration(nextDuration);
      return;
    }

    // MediaRecorder WebM files can expose Infinity until the browser seeks once.
    if (nextDuration === Infinity && !audio.dataset.durationProbe) {
      audio.dataset.durationProbe = "true";
      const resolveDuration = () => {
        const resolved = Number(audio.duration);
        if (Number.isFinite(resolved) && resolved > 0) setMeasuredDuration(resolved);
        audio.currentTime = 0;
      };
      audio.addEventListener("timeupdate", resolveDuration, { once: true });
      audio.currentTime = 1e10;
      return;
    }

    const fallback = Number(duration);
    if (Number.isFinite(fallback) && fallback > 0) setMeasuredDuration(fallback);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  return <div className="chapter-voice-prototype">
    <div className="chapter-voice-prototype-player">
      <audio
        onDurationChange={(event) => measureDuration(event.currentTarget)}
        onEnded={() => { setElapsed(0); setPlaying(false); }}
        onLoadedMetadata={(event) => measureDuration(event.currentTarget)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={(event) => setElapsed(Number(event.currentTarget.currentTime) || 0)}
        preload="metadata"
        ref={audioRef}
        src={url}
      />
      <button aria-label={playing ? "Pause voice" : "Play voice"} onClick={toggle} type="button">{playing ? <FiPause /> : <FiPlay />}</button>
      <span aria-hidden="true">{Array.from({ length: 20 }, (_, index) => <i key={index} style={{ height: `${7 + ((index * 7) % 19)}px` }} />)}</span>
      <b>{formatDuration(measuredDuration || elapsed)}</b>
    </div>
    {transcript ? <p>{transcript}</p> : null}
  </div>;
}

export default ChapterVoicePlayer;
