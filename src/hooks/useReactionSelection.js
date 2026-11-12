import { useEffect, useRef, useState } from "react";

// Shared by the existing Seen/Wall quick tray and their expanded reaction options.
export function useReactionSelection({ busy, onSelect, onClose, enabled = true }) {
  const [selecting, setSelecting] = useState(false);
  const locked = useRef(false);
  const animation = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = enabled;
    if (!enabled) { animation.current?.cancel(); locked.current = false; setSelecting(false); }
    return () => { mounted.current = false; animation.current?.cancel(); };
  }, [enabled]);

  const choose = async (event, value) => {
    event.stopPropagation();
    if (!enabled || busy || locked.current) return;
    locked.current = true; setSelecting(true);
    const emoji = event.currentTarget.querySelector("span") || event.currentTarget;
    try {
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animation.current = emoji.animate([
          { transform: "translateY(0) scale(1)", offset: 0 },
          { transform: "translateY(-8px) scale(1.35)", offset: .4 },
          { transform: "translateY(1px) scale(.94)", offset: .75 },
          { transform: "translateY(0) scale(1)", offset: 1 },
        ], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
        await animation.current.finished;
      }
      if (!mounted.current) return;
      onSelect(value);
      onClose();
    } catch (error) {
      if (error.name !== "AbortError") throw error;
    } finally {
      animation.current = null; locked.current = false;
      if (mounted.current) setSelecting(false);
    }
  };
  return { choose, selecting };
}
