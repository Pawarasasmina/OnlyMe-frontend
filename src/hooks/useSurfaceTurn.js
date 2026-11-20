import { useLayoutEffect, useRef } from "react";

function captureSurface(surface) {
  const snapshot = surface.cloneNode(true);
  surface.querySelectorAll("video").forEach((video, index) => {
    const target = snapshot.querySelectorAll("video")[index];
    if (!target || !video.videoWidth) return;
    try { const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d").drawImage(video, 0, 0); target.poster = canvas.toDataURL(); target.removeAttribute("src"); } catch { /* Cross-origin media retains its poster. */ }
  });
  return snapshot;
}

// Keep an inert outgoing face while React renders the incoming surface.
export function useSurfaceTurn(isOpen, ownerKey, contentKey = ownerKey, mode = "cube") {
  const surfaceRef = useRef(null);
  const previous = useRef(null);
  const directionRef = useRef(1);
  useLayoutEffect(() => {
    if (!isOpen) { previous.current = null; return undefined; }
    const surface = surfaceRef.current;
    if (!surface || !ownerKey) return undefined;
    const outgoing = previous.current;
    previous.current = { key: ownerKey, snapshot: captureSurface(surface) };
    if (!outgoing || outgoing.key === ownerKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const direction = directionRef.current < 0 ? -1 : 1;
    const face = outgoing.snapshot;
    face.classList.add("motion-outgoing-face");
    face.inert = true;
    face.setAttribute("aria-hidden", "true");
    face.removeAttribute("id");
    face.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    const parent = surface.parentElement;
    const position = parent.style.position;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    Object.assign(face.style, { position: "absolute", left: `${surface.offsetLeft}px`, top: `${surface.offsetTop}px`, width: `${surface.offsetWidth}px`, height: `${surface.offsetHeight}px`, pointerEvents: "none", zIndex: "40", margin: "0", overflow: "hidden", backfaceVisibility: "hidden" });
    parent.appendChild(face);
    surface.dataset.storyTurn = direction < 0 ? "previous" : "next";
    surface.dataset.surfaceTurn = mode;
    const duration = mode === "cube" ? 360 : 420;
    const angle = mode === "cube" ? 90 : 68;
    const origin = direction > 0 ? "left center" : "right center";
    const incoming = surface.animate([
      { transform: `perspective(1200px) translateX(${direction * 100}%) rotateY(${direction * angle}deg)`, transformOrigin: origin, filter: "brightness(.65)" },
      { transform: "perspective(1200px) translateX(0%) rotateY(0deg)", transformOrigin: origin, filter: "brightness(1)" },
    ], { duration, easing: "cubic-bezier(.22,.7,.2,1)" });
    const leaving = face.animate([
      { transform: "perspective(1200px) translateX(0%) rotateY(0deg)", transformOrigin: direction > 0 ? "right center" : "left center", opacity: 1 },
      { transform: `perspective(1200px) translateX(${-direction * 100}%) rotateY(${-direction * angle}deg)`, transformOrigin: direction > 0 ? "right center" : "left center", opacity: mode === "cube" ? .6 : .15 },
    ], { duration, easing: "cubic-bezier(.22,.7,.2,1)", fill: "forwards" });
    const clear = () => { face.remove(); parent.style.position = position; delete surface.dataset.storyTurn; delete surface.dataset.surfaceTurn; };
    incoming.onfinish = clear;
    return () => { incoming.cancel(); leaving.cancel(); clear(); };
  }, [isOpen, ownerKey, mode]);
  useLayoutEffect(() => {
    if (!isOpen || !surfaceRef.current || !ownerKey) return;
    if (!previous.current || previous.current.key === ownerKey && previous.current.contentKey !== contentKey) {
      previous.current = { key: ownerKey, contentKey, snapshot: captureSurface(surfaceRef.current) };
    }
  });
  return { surfaceRef, directionRef };
}
