import { useEffect, useRef, useState } from "react";
import { FiMapPin, FiVolume2, FiVolumeX } from "react-icons/fi";
import { msg } from "../../../i18n/runtime";
import { useLanguage } from "../../../hooks/useLanguage";
import quietCityVideo from "../../../assets/videos/dubai.mp4";
import "./WallEmptyState.css";

const TYPE_MESSAGES = {
  buy_sell: "sale", looking_for: "search", need_help: "help", question: "question",
  offering: "offer", recommendation: "recommendation", event: "event",
};

export default function WallEmptyState({ location, type = "all", label, filtered, canPost, onWrite, onClear, onWorldwide }) {
  useLanguage();
  const video = useRef(null);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reducedMotion) video.current?.pause();
    else video.current?.play()?.catch(() => {});
  }, [reducedMotion]);
  const place = location || msg("wall.empty.world");
  const kind = TYPE_MESSAGES[type];
  return <section className="wall-empty-state" aria-labelledby="wall-empty-title">
    <div className="wall-empty-card">
      {!failed ? <video ref={video} className="wall-empty-video" src={quietCityVideo} autoPlay={!reducedMotion} loop muted={muted} playsInline preload="metadata" aria-hidden="true" onError={() => setFailed(true)} /> : null}
      <div className="wall-empty-shade" />
      <span className="wall-empty-place"><FiMapPin aria-hidden="true" /><b dir="auto">{place}</b></span>
      <span className="wall-empty-sticker">{msg("wall.empty.quietHours")}</span>
      <div className="wall-empty-copy">
        {label ? <p className="wall-empty-label">{label}</p> : null}
        <h3 id="wall-empty-title">{kind ? msg(`wall.empty.${kind}.title`) : msg("wall.empty.quietTitle", { place })}</h3>
        <p>{msg(kind ? `wall.empty.${kind}.message` : "wall.empty.quietMessage")}</p>
      </div>
      {!failed ? <button className="wall-empty-sound" aria-label={msg(muted ? "wall.empty.unmute" : "wall.empty.mute")} onClick={() => setMuted(current => !current)} type="button">{muted ? <FiVolumeX /> : <FiVolume2 />}</button> : null}
    </div>
    {canPost ? <button className="wall-empty-write" onClick={onWrite} type="button">{kind && label ? msg("wall.empty.postIn", { label }) : msg("wall.empty.writeFirst")}</button> : null}
    <div className="wall-empty-actions">
      {filtered ? <button onClick={onClear} type="button">{msg("wall.empty.seeNearby")}</button> : null}
      {location ? <button onClick={onWorldwide} type="button">{msg("wall.empty.goWorldwide")}</button> : null}
    </div>
  </section>;
}
