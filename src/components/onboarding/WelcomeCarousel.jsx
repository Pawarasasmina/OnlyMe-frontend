import { useEffect, useMemo, useState } from "react";
import AtseenEyeMark from "./AtseenEyeMark";

const slides = [
  {
    title: "Scrolling, finally worth it.",
    description: "Every card here is someone’s real experience — step inside and take something with you.",
    gradient: ["#1E3350", "#0A0E14"],
  },
  {
    title: "Close enough to ask.",
    description: "Message the people you discover — replies guaranteed, or your Stars come back.",
    gradient: ["#22395A", "#0A0E14"],
  },
  {
    title: "Lived it? Earn from it.",
    description: "Turn what you’ve lived into worlds people unlock. Free to scroll. Free to create.",
    gradient: ["#263752", "#0A0E14"],
  },
];

function WelcomeCarousel({ error, onAlreadyHaveAccount, onGetStarted, saving }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const touch = useMemo(() => ({ startX: 0 }), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") setIndex((value) => Math.min(slides.length - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        const delta = event.changedTouches[0].clientX - touch.startX;
        if (delta < -40) setIndex((value) => Math.min(slides.length - 1, value + 1));
        if (delta > 40) setIndex((value) => Math.max(0, value - 1));
      }}
      onTouchStart={(event) => {
        touch.startX = event.changedTouches[0].clientX;
      }}
    >
      <button
        aria-label={index < slides.length - 1 ? "Show next welcome slide" : "Start onboarding"}
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
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9CCBFF]/80">Welcome to Atseen</p>
        <h1 id="welcome-slide-title" className="mt-3 max-w-[460px] text-[clamp(2rem,5vw,3.35rem)] font-bold leading-[1.02] tracking-[-0.02em] text-white">{slide.title}</h1>
        <p className="mt-4 max-w-[460px] text-sm leading-6 text-white/62 sm:text-base" aria-live="polite">{slide.description}</p>
        <div className="mt-5 flex gap-2" role="tablist" aria-label="Welcome slides">
          {slides.map((item, slideIndex) => (
            <button
              aria-label={`Show slide ${slideIndex + 1}: ${item.title}`}
              aria-selected={slideIndex === index}
              className={`h-2 rounded-full transition-all ${slideIndex === index ? "w-8 bg-[#9CCBFF]" : "w-2 bg-white/20"}`}
              key={item.title}
              onClick={() => setIndex(slideIndex)}
              role="tab"
              type="button"
            />
          ))}
        </div>
        {error ? <p className="mt-5 rounded-2xl border border-[#F17878]/30 bg-[#F17878]/10 p-3 text-sm text-[#F17878]" role="alert">{error}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-[0.8fr_1fr]">
          <button className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/62 transition hover:bg-white/5 hover:text-white disabled:opacity-40" disabled={index === 0 || saving} onClick={previous} type="button">
            Previous
          </button>
          <button className="rounded-xl bg-[#9CCBFF] px-4 py-3 text-sm font-semibold text-[#0A0C0F] transition hover:bg-[#6FA9E8] disabled:opacity-60" disabled={saving} onClick={next} type="button">
            {index < slides.length - 1 ? "Next" : saving ? "Saving..." : "Get started"}
          </button>
        </div>
        <button className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-medium text-white/62 transition hover:bg-white/5 hover:text-white" onClick={onAlreadyHaveAccount} type="button">
          I already have an account
        </button>
      </div>
    </section>
  );
}

export default WelcomeCarousel;
