import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { FiCheck, FiStar } from "react-icons/fi";
import { postService } from "../../../services/postService";

const TOPICS = [
  ["meet_people", "Meet people"], ["work", "Work"], ["services", "Services"],
  ["housing", "Housing"], ["places", "Places"], ["food", "Food"],
  ["travel", "Travel"], ["kids_family", "Kids & Family"], ["community", "Community"],
];

export default function WallTopicSheet({ selected, inferred, location, viewerId, onClose, onSelect, anchorRef }) {
  const sheetRef = useRef(null);
  const [position, setPosition] = useState({});
  const params = { scope: location ? "custom" : "worldwide", location };
  const counts = useQuery({ queryKey: ["feed-posts", "need-counts", viewerId, params], queryFn: () => postService.getNeedCounts(params), staleTime: 15000, retry: false });
  useEffect(() => {
    const returnTarget = document.activeElement;
    const center = anchorRef.current?.closest(".social-center-scroll");
    const previousOverflow = center?.style.overflow;
    const host = anchorRef.current;
    const previousInert = host?.inert;
    if (host) host.inert = true;
    const update = () => {
      const rect = center?.getBoundingClientRect();
      setPosition(rect ? { left: rect.left, width: rect.width, top: Math.max(0, rect.top), bottom: Math.max(0, window.innerHeight - rect.bottom) } : {});
    };
    update();
    if (center) center.style.overflow = "hidden";
    const observer = new ResizeObserver(update);
    if (center) observer.observe(center);
    window.addEventListener("resize", update);
    (sheetRef.current?.querySelector('[aria-pressed="true"]') || sheetRef.current?.querySelector("button"))?.focus();
    return () => {
      if (host) host.inert = previousInert;
      if (center) center.style.overflow = previousOverflow;
      observer.disconnect();
      window.removeEventListener("resize", update);
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [anchorRef]);
  const handleKeyDown = (event) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const buttons = [...sheetRef.current.querySelectorAll("button")];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  return createPortal(<div className="wall-topic-layer" style={position} onKeyDown={handleKeyDown}>
    <button className="wall-topic-scrim" aria-label="Close topic picker" tabIndex={-1} onClick={onClose} type="button" />
    <section aria-modal="true" aria-labelledby="wall-topic-title" className="wall-topic-sheet" role="dialog" ref={sheetRef}>
      <span className="wall-topic-handle" aria-hidden="true" />
      <h2 id="wall-topic-title">Choose topic</h2>
      <p>Helps the right people find your post</p>
      <button aria-pressed={!selected} className={`wall-topic-auto ${!selected ? "is-selected" : ""}`} onClick={() => onSelect("")} type="button">
        <FiStar aria-hidden="true" /><span><strong>Auto — from your text</strong><small>{inferred ? `Right now: ${inferred}` : "We'll pick it as you write"}</small></span>{!selected ? <FiCheck aria-hidden="true" /> : null}
      </button>
      {counts.isError ? <button className="wall-topic-retry" onClick={() => counts.refetch()} type="button">Could not load activity. Retry</button> : null}
      <div className="wall-topic-scroll"><div className="wall-topic-grid">
        {TOPICS.map(([key, label]) => {
          const total = counts.data?.topicCounts?.[key];
          return <button aria-pressed={selected === label} className={selected === label ? "is-selected" : ""} key={key} onClick={() => onSelect(label)} type="button"><strong>{label}{selected === label ? <FiCheck aria-hidden="true" /> : null}</strong><small>{counts.isPending ? "Loading..." : total == null ? "Count unavailable" : total ? `${total} active` : "Quiet"}</small></button>;
        })}
      </div></div>
    </section>
  </div>, document.body);
}
