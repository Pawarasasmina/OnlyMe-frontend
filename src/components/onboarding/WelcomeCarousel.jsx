import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useState } from "react";
import LanguageSetting from "../profile/LanguageSetting";
import { FiGlobe } from "react-icons/fi";
import AtseenEyeMark from "./AtseenEyeMark";

const slides = [
  {
    get title() { return __msg("onboarding.scrollingFinallyWorthIt"); },
    get description() { return __msg("onboarding.everyCardHereIsSomeoneSRealExperienceStep"); },
    gradient: ["#1E3350", "#0A0E14"],
  },
  {
    get title() { return __msg("onboarding.closeEnoughToAsk"); },
    get description() { return __msg("onboarding.messageThePeopleYouDiscoverRepliesGuaranteedOrYour"); },
    gradient: ["#22395A", "#0A0E14"],
  },
  {
    get title() { return __msg("onboarding.livedItEarnFromIt"); },
    get description() { return __msg("onboarding.turnWhatYouVeLivedIntoWorldsPeopleUnlock"); },
    gradient: ["#263752", "#0A0E14"],
  },
];

function WelcomeCarousel({ error, onAlreadyHaveAccount, onGetStarted, saving }) {
  const { language } = __useUiLanguage();
  const rtl = language === "ar";
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const touch = useMemo(() => ({ startX: 0 }), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target?.closest?.('input,textarea,select,[role="dialog"]')) return;
      if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) setIndex((value) => Math.min(slides.length - 1, value + 1));
      if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rtl]);

  const previous = () => setIndex((value) => Math.max(0, value - 1));
  const next = () => {
    if (index < slides.length - 1) setIndex((value) => value + 1);
    else onGetStarted();
  };

  return (
    <section
      aria-labelledby="welcome-slide-title"
      className="flex min-h-[calc(100dvh-130px)] w-full max-w-[820px] flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-[#0A0C0F] p-5 shadow-glow sm:min-h-[520px] sm:p-7 lg:grid lg:grid-cols-[0.95fr_1fr] lg:items-center lg:gap-8 lg:p-8"
      onTouchEnd={(event) => {
        const delta = (event.changedTouches[0].clientX - touch.startX) * (rtl ? -1 : 1);
        if (delta < -40) setIndex((value) => Math.min(slides.length - 1, value + 1));
        if (delta > 40) setIndex((value) => Math.max(0, value - 1));
      }}
      onTouchStart={(event) => {
        touch.startX = event.changedTouches[0].clientX;
      }}
    >
      <button
        aria-label={index < slides.length - 1 ? __msg("onboarding.showNextWelcomeSlide") : __msg("onboarding.startOnboarding")}
        className="flex min-h-[240px] items-center justify-center rounded-[20px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9CCBFF] sm:min-h-[300px]"
        onClick={next}
        style={{
          background: `radial-gradient(120% 80% at 50% 30%, rgba(156,203,255,.18), transparent 60%), linear-gradient(180deg, ${slide.gradient[0]}, ${slide.gradient[1]} 72%)`,
        }}
        type="button"
      >
        <AtseenEyeMark className="h-28 w-44 animate-[atseen-eye-pulse_3s_ease-in-out_infinite] sm:h-32 sm:w-52" />
      </button>
      <div className="flex flex-1 flex-col justify-end pt-8 lg:justify-center lg:pt-0">
        <LanguageSetting renderTrigger={(open, current) => <button type="button" onClick={open} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white"><FiGlobe />{current.name}</button>} />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9CCBFF]/80">{__msg("onboarding.welcomeToAtseen")}</p>
        <h1 dir="auto" id="welcome-slide-title" className="mt-3 max-w-[460px] text-[clamp(2rem,5vw,3.35rem)] font-bold leading-[1.02] tracking-[-0.02em] text-white">{slide.title}</h1>
        <p className="mt-4 max-w-[460px] text-sm leading-6 text-white/62 sm:text-base" aria-live="polite">{slide.description}</p>
        <div className="mt-5 flex gap-2" role="tablist" aria-label={__msg("onboarding.welcomeSlides")}>
          {slides.map((item, slideIndex) => (
            <button
              aria-label={__msg("onboarding.showSlide", { value0: slideIndex + 1, value1: item.title })}
              aria-selected={slideIndex === index}
              className={`h-2 rounded-full transition-all ${slideIndex === index ? "w-8 bg-[#9CCBFF]" : "w-2 bg-white/20"}`}
              key={item.title}
              onClick={() => setIndex(slideIndex)}
              role="tab"
              type="button"
            />
          ))}
        </div>
        {error ? <p className="mt-5 rounded-2xl border border-[#F17878]/30 bg-[#F17878]/10 p-3 text-sm text-[#F17878]" role="alert">{__systemMessage(error)}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-[0.8fr_1fr]">
          <button className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/62 transition hover:bg-white/5 hover:text-white disabled:opacity-40" disabled={index === 0 || saving} onClick={previous} type="button">{__msg("fanWeb.previous")}</button>
          <button className="rounded-xl bg-[#9CCBFF] px-4 py-3 text-sm font-semibold text-[#0A0C0F] transition hover:bg-[#6FA9E8] disabled:opacity-60" disabled={saving} onClick={next} type="button">
            {index < slides.length - 1 ? __msg("onboarding.next") : saving ? __msg("admin.saving") : __msg("onboarding.getStarted")}
          </button>
        </div>
        <button className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-medium text-white/62 transition hover:bg-white/5 hover:text-white" onClick={onAlreadyHaveAccount} type="button">{__msg("onboarding.iAlreadyHaveAnAccount")}</button>
      </div>
    </section>
  );
}

export default WelcomeCarousel;
