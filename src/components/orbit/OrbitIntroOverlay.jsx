/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";

const beats = [
  {
    get title() { return __msg("orbit.thisIsYou"); },
    get text() { return __msg("orbit.yourStarTheCentreOfYourOwnOrbit"); },
    spotlight: "h-28 w-28",
    position: "left-1/2 top-1/2",
  },
  {
    get title() { return __msg("orbit.everyLightIsAPerson"); },
    get text() { return __msg("orbit.theCloserALightDriftsToYouThe"); },
    spotlight: "h-[320px] w-[320px] max-sm:h-[260px] max-sm:w-[260px]",
    position: "left-1/2 top-[46%]",
  },
  {
    get title() { return __msg("orbit.tapAnyLight"); },
    get text() { return __msg("orbit.weWillShowThePersonAndTellYou"); },
    spotlight: "h-[230px] w-[230px] max-sm:h-[190px] max-sm:w-[190px]",
    position: "left-1/2 top-1/2",
  },
];

function OrbitIntroOverlay({ isOpen, onComplete }) {
  __useUiLanguage();
  const [index, setIndex] = useState(0);
  const beat = beats[index];
  const isLast = index === beats.length - 1;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onComplete();
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (isLast) onComplete();
        else setIndex((current) => current + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLast, isOpen, onComplete]);

  if (!isOpen) return null;

  const advance = () => {
    if (isLast) onComplete();
    else setIndex((current) => current + 1);
  };

  return (
    <button
      aria-label={`${beat.title} ${beat.text} ${isLast ? __msg("orbit.finishOrbitIntroduction") : __msg("orbit.continueOrbitIntroduction")}`}
      className="fixed inset-0 z-[60] cursor-pointer overflow-hidden bg-black/80 text-center text-atseen-text backdrop-blur-[2px]"
      onClick={advance}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`absolute ${beat.position} ${beat.spotlight} -translate-x-1/2 -translate-y-1/2 rounded-full border border-atseen-blue/55 shadow-[0_0_0_9999px_rgba(4,6,9,0.82),0_0_42px_rgba(138,184,255,0.25)] transition-all duration-300`}
      />
      <span className="absolute left-6 right-6 top-[68%] mx-auto block max-w-md sm:top-[70%]">
        <span dir="auto" className="block text-xl font-extrabold tracking-tight">{beat.title}</span>
        <span dir="auto" className="mt-2 block text-sm leading-6 text-atseen-muted">{beat.text}</span>
        <span className="mt-5 inline-flex items-center justify-center rounded-full border border-atseen-line bg-atseen-surface px-5 py-2 text-xs font-bold text-atseen-muted">
          {isLast ? __msg("orbit.gotIt") : __msg("orbit.tapToContinue3", { value0: index + 1 })}
        </span>
      </span>
    </button>
  );
}

export default OrbitIntroOverlay;
