import { useLayoutEffect, useRef } from "react";

// Only turn between people; advancing a person's individual stories stays instant.
export function useStoryPersonTransition(isOpen, ownerKey) {
  const surfaceRef = useRef(null);
  const previousOwner = useRef(null);
  const directionRef = useRef(1);
  useLayoutEffect(() => {
    if (!isOpen) { previousOwner.current = null; return undefined; }
    if (!ownerKey) return undefined;
    const previous = previousOwner.current;
    previousOwner.current = ownerKey;
    const surface = surfaceRef.current;
    if (!previous || previous === ownerKey || !surface || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const direction = directionRef.current < 0 ? -1 : 1;
    surface.dataset.storyTurn = direction < 0 ? "previous" : "next";
    const animation = surface.animate([
      { transform: `perspective(1200px) rotateY(${direction * 65}deg)`, transformOrigin: direction > 0 ? "left center" : "right center", opacity: .3 },
      { transform: "perspective(1200px) rotateY(0deg)", transformOrigin: direction > 0 ? "left center" : "right center", opacity: 1 },
    ], { duration: 180, easing: "ease-out" });
    const clear = () => { delete surface.dataset.storyTurn; };
    animation.onfinish = clear;
    return () => { animation.cancel(); clear(); };
  }, [isOpen, ownerKey]);
  return { surfaceRef, directionRef };
}
