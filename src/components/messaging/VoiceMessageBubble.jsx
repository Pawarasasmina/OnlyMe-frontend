import { useEffect, useRef, useState } from "react";
import { FiPause, FiPlay } from "react-icons/fi";

const clock = (seconds = 0) => {
  const numeric = Number(seconds);
  const safe = Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

const finiteDuration = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

export default function VoiceMessageBubble({ audio, mine = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const suppliedDuration = finiteDuration(audio?.duration);
  const [duration, setDuration] = useState(suppliedDuration);
  const [failed, setFailed] = useState(false);
  const waveform = audio?.waveform?.length ? audio.waveform : Array.from({ length: 28 }, (_, index) => 0.22 + ((index * 7) % 9) / 13);

  useEffect(() => () => audioRef.current?.pause(), []);
  const toggle = async () => {
    const player = audioRef.current;
    if (!player || failed) return;
    if (player.paused) await player.play().catch(() => setFailed(true));
    else player.pause();
  };
  const seek = (seconds) => {
    const next = Math.min(duration, Math.max(0, finiteDuration(seconds)));
    if (!audioRef.current || duration <= 0) return;
    audioRef.current.currentTime = next;
    setCurrent(next);
  };
  const seekFromWaveform = (event) => {
    if (duration <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - bounds.left) / bounds.width) * duration);
  };
  const startWaveformDrag = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekFromWaveform(event);
  };
  const dragWaveform = (event) => {
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    seekFromWaveform(event);
  };

  return <div className="flex min-w-[190px] items-center gap-2.5">
    <audio onDurationChange={(event) => setDuration(finiteDuration(event.currentTarget.duration, suppliedDuration))} onEnded={() => { setPlaying(false); setCurrent(0); }} onError={() => setFailed(true)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onTimeUpdate={(event) => setCurrent(finiteDuration(event.currentTarget.currentTime))} preload="metadata" ref={audioRef} src={audio?.url} />
    <button aria-label={playing ? "Pause voice message" : "Play voice message"} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${mine ? "bg-atseen-bg/15" : "bg-atseen-blue/15 text-atseen-blue"}`} disabled={failed} onClick={toggle} type="button">{playing ? <FiPause /> : <FiPlay className="ml-0.5" />}</button>
    <div className="min-w-0 flex-1">
      <button aria-label={`Seek voice message. Current position ${clock(current)} of ${clock(duration)}`} className="flex h-8 w-full touch-none cursor-pointer items-center gap-[2px]" disabled={failed || duration <= 0} onDoubleClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); seek(current - 5); } if (event.key === "ArrowRight") { event.preventDefault(); seek(current + 5); } }} onPointerDown={startWaveformDrag} onPointerMove={dragWaveform} type="button">{waveform.slice(0, 36).map((level, index) => {
        const progress = duration > 0 && Number.isFinite(duration) ? current / duration : 0;
        const played = index / Math.max(1, waveform.length - 1) <= progress;
        return <span className={`w-[2px] flex-1 rounded-full ${played ? mine ? "bg-atseen-bg" : "bg-atseen-blue" : mine ? "bg-atseen-bg/35" : "bg-atseen-muted/45"}`} key={index} style={{ height: `${Math.max(4, Math.round(Number(level) * 22))}px` }} />;
      })}</button>
      <div className={`mt-0.5 flex justify-between text-[9px] ${mine ? "text-atseen-bg/60" : "text-atseen-muted"}`}><span>{failed ? "Audio unavailable" : playing ? clock(current) : "Voice message"}</span><span>{clock(duration)}</span></div>
    </div>
  </div>;
}
