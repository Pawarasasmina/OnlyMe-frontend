import { useEffect, useRef, useState } from "react";
import { FiPause, FiPlay } from "react-icons/fi";

const clock = (seconds = 0) => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

export default function VideoNoteBubble({ mine = false, video }) {
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(Number(video?.duration) || 0);
  const [failed, setFailed] = useState(false);
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const radius = 47;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => () => playerRef.current?.pause(), []);
  const toggle = async () => {
    const player = playerRef.current;
    if (!player || failed) return;
    if (player.paused) await player.play().catch(() => setFailed(true));
    else player.pause();
  };

  return <div className="relative h-56 w-56 sm:h-64 sm:w-64">
    <video className="h-full w-full rounded-full bg-black object-cover" disablePictureInPicture onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : Number(video?.duration) || 0)} onEnded={() => { setPlaying(false); setCurrent(0); }} onError={() => setFailed(true)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} playsInline preload="metadata" ref={playerRef} src={video?.url} />
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" fill="none" r={radius} stroke={mine ? "rgba(10,12,15,.22)" : "rgba(255,255,255,.16)"} strokeWidth="2" />
      <circle cx="50" cy="50" fill="none" r={radius} stroke={mine ? "#0A0C0F" : "#9CCBFF"} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} strokeLinecap="round" strokeWidth="2" />
    </svg>
    <button aria-label={playing ? "Pause video note" : "Play video note"} className={`absolute inset-0 grid place-items-center rounded-full transition duration-200 hover:bg-black/20 hover:opacity-100 focus-visible:bg-black/20 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atseen-blue ${playing ? "bg-transparent opacity-0" : "bg-black/10 opacity-100"}`} disabled={failed} onClick={toggle} type="button"><span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-2xl text-white shadow-xl backdrop-blur-sm">{playing ? <FiPause /> : <FiPlay className="ml-1" />}</span></button>
    <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 font-mono text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">{failed ? "Unavailable" : playing ? clock(current) : clock(duration)}</span>
  </div>;
}
