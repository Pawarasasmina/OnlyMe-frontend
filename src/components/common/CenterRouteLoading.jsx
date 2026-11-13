/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import SeenEyeMark from "../branding/SeenEyeMark";
import WelcomeMoment from "../onboarding/WelcomeMoment";

function CenterRouteLoading({ light = false }) {
  __useUiLanguage();
  return (
    <div aria-label={__msg("common.loadingPage")} className={`center-route-loading ${light ? "is-light" : ""}`} role="status">
      <SeenEyeMark className="center-route-loading__eye" />
      <span className="sr-only">{__msg("common.loadingPage")}</span>
    </div>
  );
}

function CenterRefreshOverlay({ light = false }) {
  __useUiLanguage();
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
      {light ? <CenterRouteLoading light /> : <div aria-label={__msg("common.loadingPage")} className="center-route-loading" role="status"><WelcomeMoment returning /><span className="sr-only">{__msg("common.loadingPage")}</span></div>}
    </div>
  );
}

export default CenterRouteLoading;
export { CenterRefreshOverlay };
