import { useEffect, useState } from "react";

export function useStoryViewerPosition(isOpen) {
  const [position, setPosition] = useState(undefined);

  useEffect(() => {
    if (!isOpen || window.innerWidth < 881) { setPosition(undefined); return undefined; }
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      if (window.innerWidth < 881) { setPosition(undefined); return; }
      const bounds = centerColumn.getBoundingClientRect();
      setPosition({
        left: `${bounds.left}px`,
        right: "auto",
        width: `${bounds.width}px`,
        "--story-viewer-column-left": `${bounds.left}px`,
        "--story-viewer-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [isOpen]);

  return position;
}
