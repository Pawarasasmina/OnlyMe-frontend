import { useEffect, useState } from "react";
import SeenEyeMark from "../branding/SeenEyeMark";

function CenterRouteLoading({ light = false }) {
  return (
    <div aria-label="Loading page" className={`center-route-loading ${light ? "is-light" : ""}`} role="status">
      <SeenEyeMark className="center-route-loading__eye" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

function CenterRefreshOverlay({ light = false }) {
  const [phase, setPhase] = useState("holding");

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("leaving"), 700);
    const removeTimer = window.setTimeout(() => setPhase("done"), 1100);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className={`center-refresh-overlay ${light ? "is-light" : ""} ${phase === "leaving" ? "is-leaving" : ""}`}>
      <CenterRouteLoading light={light} />
    </div>
  );
}

export default CenterRouteLoading;
export { CenterRefreshOverlay };
