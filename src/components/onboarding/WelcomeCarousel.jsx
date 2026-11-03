import { useEffect, useRef, useState } from "react";
import { FiGlobe } from "react-icons/fi";
import { useLanguage } from "../../hooks/useLanguage";

const slides = [
  { type: "story", person: "Lina · Paris", chapter: "CHAPTER 2 OF 5", line: "Before 8am", title: "STEP INTO REAL LIVES", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=90" },
  { type: "worlds", person: "For you", title: "SWIPE THROUGH WORLDS", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=90" },
  { type: "answer", person: "Maya · Dubai", title: "ASK. THEY ANSWER.", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=90" },
  { type: "support", person: "Mia got The Crown · 🪙 950", title: "SUPPORT WHAT YOU LOVE", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=90" },
];
const worldImages = [
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=90",
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=90",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=90",
];
const languages = [["en","English"],["ar","العربية"],["ru","Русский"],["uk","Українська"],["es","Español"],["pt","Português"],["fr","Français"],["de","Deutsch"]];

export default function WelcomeCarousel({ error, onAlreadyHaveAccount, onGetStarted, saving }) {
  const { language, setLanguage } = useLanguage();
  const track = useRef(null);
  const drag = useRef({ active: false, axis: null, startX: 0, startY: 0, startScrollLeft: 0, world: false });
  const animationFrame = useRef(null);
  const [active, setActive] = useState(0);
  const [interactionVersion, setInteractionVersion] = useState(0);
  const [worldIndex, setWorldIndex] = useState(0);
  const [worldDragOffset, setWorldDragOffset] = useState(0);
  const [worldDragging, setWorldDragging] = useState(false);

  const closest = (node) => {
    const center = node.scrollLeft + node.clientWidth / 2;
    return Array.from(node.children).reduce((best, card, index) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
  };
  useEffect(() => {
    const node = track.current;
    if (!node) return undefined;
    const update = () => setActive(closest(node));
    node.addEventListener("scroll", update, { passive: true });
    return () => node.removeEventListener("scroll", update);
  }, []);
  const go = (index) => {
    const node = track.current, card = node?.children[index];
    if (!node || !card) return;
    const from = node.scrollLeft, to = card.offsetLeft - (node.clientWidth - card.offsetWidth) / 2;
    const startedAt = performance.now();
    cancelAnimationFrame(animationFrame.current);
    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / 560);
      node.scrollLeft = from + (to - from) * (1 - Math.pow(1 - progress, 4));
      if (progress < 1) animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
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
      const atEnd = worldIndex === worldImages.length - 1 && deltaY < 0;
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
        setWorldIndex((value) => Math.max(0, Math.min(worldImages.length - 1, value + (deltaY < 0 ? 1 : -1))));
      }
      setWorldDragOffset(0);
    } else go(closest(node));
  };
  useEffect(() => {
    const timer = setTimeout(() => go((active + 1) % slides.length), 4200);
    return () => clearTimeout(timer);
  }, [active, interactionVersion]);
  useEffect(() => () => cancelAnimationFrame(animationFrame.current), []);

  return <main className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-[470px] flex-col overflow-hidden border-x border-white/[.06] bg-[#05080B] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_82%_48%_at_50%_61%,rgba(77,145,205,.25)_0%,rgba(31,78,119,.13)_42%,transparent_76%),radial-gradient(ellipse_110%_25%_at_50%_100%,rgba(62,135,203,.18),transparent_72%)]" />
    <header className="z-10 flex items-center justify-between px-8 pb-5 pt-[max(42px,env(safe-area-inset-top))]"><div className="text-[21px] font-black tracking-[-.04em]"><span className="text-[#9CCBFF]">@</span>seen</div><label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-3 py-2 text-xs font-bold"><FiGlobe /><select aria-label="Language" className="max-w-[86px] bg-transparent outline-none" onChange={(event) => setLanguage(event.target.value)} value={language}>{languages.map(([code,name]) => <option className="bg-[#0A0C0F]" key={code} value={code}>{name}</option>)}</select></label></header>
    <div className="flex flex-1 cursor-grab snap-x snap-mandatory touch-none select-none items-center gap-4 overflow-x-auto px-[16%] py-3 active:cursor-grabbing [scrollbar-width:none]" onPointerCancel={endDrag} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} ref={track}>
      {slides.map((slide, slideIndex) => <article className="relative aspect-[9/16] w-[78vw] max-w-[316px] shrink-0 snap-center overflow-hidden rounded-[25px] border border-white/10 bg-[#111820] shadow-[0_28px_70px_rgba(0,0,0,.55)]" data-slide-index={slideIndex} data-slide-type={slide.type} key={slide.title}>
        {slide.type === "worlds" ? <div className={`pointer-events-none absolute inset-0 ${worldDragging ? "" : "transition-transform duration-500 ease-out"}`} style={{ transform: `translateY(calc(${-worldIndex * 100}% + ${worldDragOffset}px))` }}>
          {worldImages.map((image, index) => <img alt={`World ${index + 1}`} className="h-full w-full object-cover" draggable="false" key={image} src={image} />)}
        </div> : <img alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" draggable="false" src={slide.image} />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#081019] via-transparent to-black/10" />
        <div className="absolute left-4 right-4 top-3 flex gap-1">{Array.from({ length: 5 }, (_, index) => <i className={`h-[3px] flex-1 rounded-full ${index <= Math.min(4, slideIndex + 1) ? "bg-white" : "bg-white/30"}`} key={index} />)}</div>
        <div className={`absolute top-8 rounded-full bg-[#182330]/85 px-2.5 py-1.5 text-[11px] font-bold backdrop-blur ${slide.type === "support" ? "left-1/2 -translate-x-1/2 whitespace-nowrap" : "left-4"}`}>{slide.person}</div>
        {slide.type === "answer" && <div className="absolute left-11 right-3 top-[25%] space-y-2 text-[12px]"><p className="ml-7 rounded-t-2xl rounded-bl-2xl bg-[#9CCBFF] p-3 text-[#07101A]">First week in Dubai — where should I stay?</p><p className="rounded-2xl bg-[#121820]/90 p-3 shadow-xl">JBR. Walk the Marina at sunset and take the tram, not taxis.<small className="mt-1 block text-white/50">Direct Access · answered in 2h</small></p></div>}
        {slide.type === "worlds" && <div aria-label={`World ${worldIndex + 1} of ${worldImages.length}`} className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">{worldImages.map((image, index) => <i className={`w-1 rounded-full transition-all duration-300 ${index === worldIndex ? "h-6 bg-white" : "h-3 bg-white/30"}`} key={image} />)}</div>}
        <div className="absolute bottom-5 left-4 right-4">{slide.chapter && <p className="text-[10px] font-black tracking-[.16em] text-white/60">{slide.chapter}</p>}{slide.line && <p className="mt-1 text-sm font-bold">{slide.line}</p>}<h1 className="mt-5 max-w-[250px] text-[24px] font-black leading-[.98] tracking-[-.035em]">{slide.title}</h1><span className="absolute bottom-0 right-0 text-sm font-black"><i className="not-italic text-[#9CCBFF]">@</i>seen</span></div>
      </article>)}
    </div>
    <footer className="px-8 pb-[max(24px,env(safe-area-inset-bottom))] pt-3"><div className="mb-5 flex justify-center gap-1.5">{slides.map((slide,index) => <button aria-label={`Open slide ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === active ? "w-5 bg-[#9CCBFF]" : "w-1.5 bg-white/25"}`} key={slide.title} onClick={() => { setInteractionVersion((value) => value + 1); go(index); }} type="button" />)}</div>{error ? <p className="mb-3 rounded-xl bg-red-400/10 p-3 text-xs text-red-200">{error}</p> : null}<button className="w-full rounded-2xl bg-[#9CCBFF] py-4 text-[15px] font-black text-[#0A0C0F] shadow-[0_12px_30px_rgba(87,153,220,.25)] active:scale-[.97] disabled:opacity-50" disabled={saving} onClick={onGetStarted} type="button">{saving ? "Starting…" : "Get started"}</button><button className="mt-3 w-full text-center text-xs text-white/55" onClick={onAlreadyHaveAccount} type="button">Already have an account? <b className="text-white">Log in</b></button></footer>
  </main>;
}
