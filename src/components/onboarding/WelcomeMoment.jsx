import SeenEyeMark from "../branding/SeenEyeMark";
import { msg } from "../../i18n/runtime";
import { useLanguage } from "../../hooks/useLanguage";
import "./WelcomeMoment.css";

// The final prototype uses the short blink for returning sessions. Keep the
// retained long sequence available without replacing first-visit video onboarding.
export default function WelcomeMoment({ returning = false, onContinue }) {
  useLanguage();
  if (returning) return <SeenEyeMark className="welcome-eye welcome-eye--returning" />;
  return <section className="welcome-moment"><SeenEyeMark className="welcome-eye welcome-eye--opening" /><h1 className="welcome-moment-line">{msg("social.youVeBeenSeen")}</h1><button className="welcome-moment-cta" onClick={onContinue} type="button">{msg("publication.stepInside")}</button><div aria-hidden="true" className="welcome-moment-mark"><em>@</em>seen</div></section>;
}
