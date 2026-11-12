import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useRef, useState } from "react";
import { FiGlobe, FiX } from "react-icons/fi";
import { useLanguage } from "../../hooks/useLanguage";
import parisVideo from "../../assets/videos/paris.mp4";
import gymVideo from "../../assets/videos/gym.mp4";
import surfVideo from "../../assets/videos/surf.mp4";
import foodVideo from "../../assets/videos/food.mp4";
import dubaiVideo from "../../assets/videos/dubai.mp4";
import fashionVideo from "../../assets/videos/fashion.mp4";
import crownImage from "../../assets/images/a_crown.png";
import goldCoinImage from "../../assets/images/goldcoin.png";

const slides = [
  { type: "story", get person() { return __msg("onboarding.linaParis"); }, get chapter() { return __msg("system.chapterPosition", { current: 2, total: 5 }); }, get line() { return __msg("onboarding.before8am"); }, titleKey: "welcome.stepIntoRealLives", video: parisVideo },
  { type: "worlds", get person() { return __msg("fan.forYou"); }, titleKey: "welcome.swipeThroughWorlds" },
  { type: "answer", get person() { return __msg("onboarding.mayaDubai"); }, titleKey: "welcome.askTheyAnswer", video: dubaiVideo },
  { type: "support", get person() { return __msg("onboarding.miaGotTheCrown"); }, titleKey: "welcome.supportWhatYouLove", video: fashionVideo },
];
const worldVideos = [
  { get label() { return __msg("system.WelcomeCarousel.bc4359231d"); }, src: gymVideo },
  { get label() { return __msg("system.WelcomeCarousel.3895894ce1"); }, src: surfVideo },
  { get label() { return __msg("fanWeb.food"); }, src: foodVideo },
];
const languages = [["en","English"],["ar","العربية"],["ru","Русский"],["uk","Українська"],["es","Español"],["pt","Português"],["fr","Français"],["de","Deutsch"]];

function OnboardingVideo({ active, label, src }) {
  __useUiLanguage();
  const video = useRef(null);

  useEffect(() => {
    const node = video.current;
    if (!node) return;
    if (active) node.play().catch(() => {});
    else node.pause();
  }, [active]);

  return <video aria-label={label} className="pointer-events-none block h-full w-full object-cover" disablePictureInPicture loop muted playsInline preload="metadata" ref={video} src={src} />;
}

export default function WelcomeCarousel({ error, onAlreadyHaveAccount: openLogin, onContinueLastAccount, onGetStarted, saving }) {
  __useUiLanguage();
  const { language, setLanguage, t } = useLanguage();
  const track = useRef(null);
  const drag = useRef({ active: false, axis: null, startX: 0, startY: 0, startScrollLeft: 0, world: false });
  const animationFrame = useRef(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const [interactionVersion, setInteractionVersion] = useState(0);
  const [worldIndex, setWorldIndex] = useState(0);
  const [worldDragOffset, setWorldDragOffset] = useState(0);
  const [worldDragging, setWorldDragging] = useState(false);
  const [lastUser, setLastUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("onlyme_last_user") || "null"); }
    catch { return null; }
  });

  const closest = (node) => {
    const center = node.getBoundingClientRect().left + node.clientWidth / 2;
    return Array.from(node.children).reduce((best, card, index) => {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
  };
  useEffect(() => {
    const node = track.current;
    if (!node) return undefined;
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const center = node.getBoundingClientRect().left + node.clientWidth / 2;
        Array.from(node.children).forEach((card) => {
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const distance = Math.min(1, Math.abs(cardCenter - center) / Math.max(card.offsetWidth, 1));
          const prominence = 1 - distance;
          card.style.transform = `scale(${0.92 + prominence * 0.08}) translateY(${distance * 8}px)`;
          card.style.opacity = String(0.58 + prominence * 0.42);
        });
        setActive(closest(node));
      });
    };
    node.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", update);
    };
  }, []);
  const go = (index) => {
    const node = track.current, card = node?.children[index];
    if (!node || !card) return;
    const rect = card.getBoundingClientRect();
    const from = node.scrollLeft, to = from + rect.left + rect.width / 2 - node.getBoundingClientRect().left - node.clientWidth / 2;
    const startedAt = performance.now();
    cancelAnimationFrame(animationFrame.current);
    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / 760);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      node.scrollLeft = from + (to - from) * eased;
      if (progress < 1) animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
  };
  useEffect(() => {
    const node = track.current, card = node?.children[activeRef.current];
    if (!node || !card) return;
    cancelAnimationFrame(animationFrame.current);
    const rect = card.getBoundingClientRect();
    node.scrollLeft += rect.left + rect.width / 2 - node.getBoundingClientRect().left - node.clientWidth / 2;
  }, [language]);
  const navigateWithKeyboard = event => {
    if (event.target.closest("select,input,textarea,[contenteditable=true]")) return;
    const forward = language === "ar" ? "ArrowLeft" : "ArrowRight";
    const backward = language === "ar" ? "ArrowRight" : "ArrowLeft";
    if (![forward, backward, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setInteractionVersion(value => value + 1);
    go(event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1 : Math.max(0, Math.min(slides.length - 1, active + (event.key === forward ? 1 : -1))));
  };
  const startDrag = (event) => {
    const node = track.current;
    if (!node) return;
    cancelAnimationFrame(animationFrame.current);
    const card = event.target.closest("[data-slide-index]");
    drag.current = {
      active: true,
      axis: null,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: node.scrollLeft,
      world: card?.dataset.slideType === "worlds",
    };
    node.setPointerCapture?.(event.pointerId);
    setInteractionVersion((value) => value + 1);
  };
  const moveDrag = (event) => {
    const gesture = drag.current;
    const node = track.current;
    if (!gesture.active || !node) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 5) {
      gesture.axis = gesture.world && Math.abs(deltaY) > Math.abs(deltaX) ? "y" : "x";
      if (gesture.axis === "y") setWorldDragging(true);
    }
    if (gesture.axis === "y") {
      event.preventDefault();
      const atStart = worldIndex === 0 && deltaY > 0;
      const atEnd = worldIndex === worldVideos.length - 1 && deltaY < 0;
      setWorldDragOffset((atStart || atEnd) ? deltaY * 0.2 : deltaY);
    } else if (gesture.axis === "x") {
      node.scrollLeft = gesture.startScrollLeft - deltaX;
    }
  };
  const endDrag = (event) => {
    const node = track.current;
    if (!node || !drag.current.active) return;
    const axis = drag.current.axis;
    const deltaY = event.clientY - drag.current.startY;
    drag.current.active = false;
    node.releasePointerCapture?.(event.pointerId);
    setWorldDragging(false);
    if (axis === "y") {
      if (Math.abs(deltaY) > 55) {
        setWorldIndex((value) => Math.max(0, Math.min(worldVideos.length - 1, value + (deltaY < 0 ? 1 : -1))));
      }
      setWorldDragOffset(0);
    } else go(closest(node));
  };
  useEffect(() => {
    if (choosingLanguage) return undefined;
    const timer = setTimeout(() => go((active + 1) % slides.length), 4200);
    return () => clearTimeout(timer);
  }, [active, interactionVersion, choosingLanguage]);
  useEffect(() => () => cancelAnimationFrame(animationFrame.current), []);

  return <main onKeyDown={navigateWithKeyboard} tabIndex={-1} className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-[447px] flex-col overflow-hidden border-x border-white/[.06] bg-[#05080B] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_74%_30%_at_50%_70%,rgba(56,132,199,.14)_0%,rgba(27,75,116,.075)_42%,transparent_76%),radial-gradient(ellipse_72%_10%_at_50%_91%,rgba(94,169,237,.10)_0%,transparent_76%)]" />
    <div aria-hidden="true" className="pointer-events-none absolute bottom-[14%] left-1/2 z-0 h-12 w-[68%] -translate-x-1/2 rounded-full bg-[#4C9DE8]/[.07] blur-[30px]" />
    <header className="z-10 flex items-center justify-between px-7 pb-5 pt-[max(42px,env(safe-area-inset-top))]"><div className="text-[21px] font-black tracking-[-.04em]"><span className="text-[#9CCBFF]">@</span>seen</div><label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-3 py-2 text-xs font-bold"><FiGlobe /><select onFocus={() => setChoosingLanguage(true)} onBlur={() => setChoosingLanguage(false)} onKeyDown={event => event.stopPropagation()} aria-label={__msg("fan.language")} className="max-w-[86px] bg-transparent outline-none" onChange={(event) => setLanguage(event.target.value)} value={language}>{languages.map(([code,name]) => <option className="bg-[#0A0C0F]" key={code} value={code}>{name}</option>)}</select></label></header>
    <div dir={language === "ar" ? "rtl" : "ltr"} className="relative z-10 flex flex-1 cursor-grab touch-none select-none items-center gap-4 overflow-x-auto px-[16%] py-3 active:cursor-grabbing [scrollbar-width:none]" onPointerCancel={endDrag} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} ref={track}>
      {slides.map((slide, slideIndex) => <article className="relative aspect-[9/17] w-[78vw] max-w-[316px] shrink-0 overflow-hidden rounded-[25px] border border-white/10 bg-[#111820] shadow-[0_28px_70px_rgba(0,0,0,.52),0_22px_50px_rgba(48,124,190,.12)] will-change-transform" data-slide-index={slideIndex} data-slide-type={slide.type} key={slide.titleKey}>
        {slide.type === "worlds" ? <div className={`pointer-events-none absolute inset-0 ${worldDragging ? "" : "transition-transform duration-500 ease-out"}`} style={{ transform: `translateY(calc(${-worldIndex * 100}% + ${worldDragOffset}px))` }}>
          {worldVideos.map((item, index) => <OnboardingVideo active={active === slideIndex && worldIndex === index} key={item.label} label={__msg("system.WelcomeCarousel.9907439b8c", { value0: item.label })} src={item.src} />)}
        </div> : <div className="pointer-events-none absolute inset-0"><OnboardingVideo active={active === slideIndex} label={__msg("system.WelcomeCarousel.709cb5637f", { value0: slide.person })} src={slide.video} /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#081019] via-transparent to-black/10" />
        {slide.type !== "support" && <div className="absolute left-4 right-4 top-3 flex gap-1">{Array.from({ length: 5 }, (_, index) => <i className={`h-[3px] flex-1 rounded-full ${index <= Math.min(4, slideIndex + 1) ? "bg-white" : "bg-white/30"}`} key={index} />)}</div>}
        {slide.type !== "support" && <div className="absolute left-4 top-8 rounded-full bg-[#182330]/85 px-2.5 py-1.5 text-[11px] font-bold backdrop-blur">{slide.person}</div>}
        {slide.type === "support" && <div className="absolute left-1/2 top-[6.5%] flex -translate-x-1/2 flex-col items-center">
          <img alt={__msg("system.WelcomeCarousel.00fbbbd90b")} className="w-[94px] drop-shadow-[0_7px_10px_rgba(0,0,0,.7)]" draggable="false" src={crownImage} />
          <div className="-mt-0.5 flex h-[26px] w-[168px] items-center justify-center whitespace-nowrap rounded-full border border-white/[.14] bg-[#202124]/95 px-2 text-[11px] font-extrabold leading-none shadow-[0_4px_12px_rgba(0,0,0,.45)] backdrop-blur-sm">
            <span>{slide.person}</span><span className="mx-[5px] text-white/55">·</span><img alt={__msg("admin.stars")} className="mr-[5px] h-3 w-3 shrink-0 object-contain" src={goldCoinImage} /><span>950</span>
          </div>
        </div>}
        {slide.type === "answer" && <div className="absolute left-11 right-3 top-[25%] space-y-2 text-[12px]"><p className="ml-7 rounded-t-2xl rounded-bl-2xl bg-[#9CCBFF] p-3 text-[#07101A]">{__msg("system.WelcomeCarousel.5523e0ad99")}</p><p className="rounded-2xl bg-[#121820]/90 p-3 shadow-xl">{__msg("system.WelcomeCarousel.9a14d40089")}<small className="mt-1 block text-white/50">{__msg("system.WelcomeCarousel.38d9baccd6")}</small></p></div>}
        {slide.type === "worlds" && <div aria-label={__msg("system.WelcomeCarousel.252e4793c7", { value0: worldVideos[worldIndex].label, value1: worldIndex + 1, value2: worldVideos.length })} className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">{worldVideos.map((item, index) => <i className={`w-1 rounded-full transition-all duration-300 ${index === worldIndex ? "h-6 bg-white" : "h-3 bg-white/30"}`} key={item.label} />)}</div>}
        <div className="absolute bottom-5 left-4 right-4">{slide.chapter && <p className="text-[10px] font-black tracking-[.16em] text-white/60">{slide.chapter}</p>}{slide.line && <p className="mt-1 text-sm font-bold">{slide.line}</p>}<h1 className={`mt-5 text-[24px] font-black leading-[.98] tracking-[-.035em] ${slide.type === "support" ? "max-w-[210px]" : "max-w-[250px]"}`}>{t(slide.titleKey)}</h1><span className="absolute bottom-0 right-0 text-sm font-black"><i className="not-italic text-[#9CCBFF]">@</i>seen</span></div>
      </article>)}
    </div>
    <footer className="relative z-10 px-7 pb-[max(24px,env(safe-area-inset-bottom))] pt-3"><div className="mb-5 flex justify-center gap-1.5">{slides.map((slide,index) => <button aria-pressed={index === active} aria-label={t("onboarding.showSlide", { value0: index + 1, value1: t(slide.titleKey) })} className={`h-1.5 rounded-full transition-all ${index === active ? "w-5 bg-[#9CCBFF]" : "w-1.5 bg-white/25"}`} key={slide.titleKey} onClick={() => { setInteractionVersion((value) => value + 1); go(index); }} type="button" />)}</div>{error ? <p className="mb-3 rounded-xl bg-red-400/10 p-3 text-xs text-red-200">{__systemMessage(error)}</p> : null}{lastUser ? <><div className="flex w-full items-center gap-3 rounded-2xl bg-[#83BAF2] p-2.5 text-left text-[#07101A] shadow-[0_12px_28px_rgba(91,166,235,.24)]"><button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onContinueLastAccount} type="button">{lastUser.avatar ? <img alt="" className="h-11 w-11 shrink-0 rounded-full border-2 border-white/70 object-cover" src={lastUser.avatar} /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/35 font-black">{lastUser.name?.[0] || "@"}</span>}<span className="min-w-0"><b className="block truncate text-sm">{t("welcome.continueAs", { value0: lastUser.name || t("welcome.yourAccount") })}</b><small className="block truncate text-[11px] text-[#07101A]/60">{lastUser.username ? `@${lastUser.username}` : lastUser.email}</small></span></button><button aria-label={t("welcome.forgetSuggestedAccount")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#07101A]/10" onClick={() => { localStorage.removeItem("onlyme_last_user"); setLastUser(null); }} type="button"><FiX /></button></div><div className="mt-3 flex items-center justify-center gap-5 text-xs"><button className="font-bold text-white" onClick={onGetStarted} type="button">{t("welcome.createNewAccount")}</button><button className="text-white/55" onClick={openLogin} type="button">{t("welcome.logInAnotherAccount")}</button></div></> : <><button className="w-full rounded-2xl bg-[#9CCBFF] py-4 text-[15px] font-black text-[#0A0C0F] shadow-[0_12px_28px_rgba(91,166,235,.26),0_0_16px_rgba(91,166,235,.08)] active:scale-[.97] disabled:opacity-50" disabled={saving} onClick={onGetStarted} type="button">{saving ? t("welcome.starting") : t("onboarding.getStarted")}</button><button className="mt-3 w-full text-center text-xs text-white/55" onClick={openLogin} type="button">{t("auth.alreadyHaveAnAccount")} <b className="text-white">{t("layout.signIn")}</b></button></>}</footer>
  </main>;
}
