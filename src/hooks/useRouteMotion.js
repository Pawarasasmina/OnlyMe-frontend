import { useLayoutEffect, useRef } from "react";

export function useRouteMotion(pathname) {
  const surfaceRef = useRef(null);
  const previous = useRef(pathname);
  useLayoutEffect(() => {
    if (previous.current === pathname) return undefined;
    previous.current = pathname;
    const surface = surfaceRef.current;
    if (!surface || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let animation, frame, done = false;
    const start = () => {
      if (done || surface.querySelector(".center-route-loading")) return;
      done = true;
      observer.disconnect();
      frame = requestAnimationFrame(() => {
        surface.dataset.routeTransition = "enter";
        animation = surface.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "cubic-bezier(.2,.7,0,1)" });
        animation.onfinish = () => { delete surface.dataset.routeTransition; };
      });
    };
    const observer = new MutationObserver(start);
    observer.observe(surface, { childList: true, subtree: true });
    start();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); animation?.cancel(); delete surface.dataset.routeTransition; };
  }, [pathname]);
  return surfaceRef;
}
