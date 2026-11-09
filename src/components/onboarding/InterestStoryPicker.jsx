import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg, optionLabel } from "../../i18n/runtime.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiCheck, FiChevronDown, FiPlus, FiSearch } from "react-icons/fi";
import beachVideo from "../../assets/videos/beach.mp4";
import cityVideo from "../../assets/videos/city.mp4";
import coffeeVideo from "../../assets/videos/coffee.mp4";

const preferredTopics = [
  { id: "Travel", name: "Travel" }, { id: "Fitness", name: "Fitness" }, { id: "Food", name: "Food" },
  { id: "Fashion", name: "Fashion" }, { id: "Lifestyle", name: "Lifestyle" }, { id: "Business", name: "Business" },
  { id: "Psychology", name: "Mindset" }, { id: "Beauty", name: "Beauty" }, { id: "Wellness", name: "Wellness" },
  { id: "Technology", name: "Technology" },
];
const stories = [
  { get chapter() { return __msg("system.chapterPosition", { current: 1, total: 6 }); }, creator: "Andre Silva", handle: "@andre", get title() { return __msg("system.InterestStoryPicker.08dd7d3e67"); }, video: beachVideo },
  { get chapter() { return __msg("system.chapterPosition", { current: 2, total: 6 }); }, creator: "Maya Chen", handle: "@mayasees", get title() { return __msg("system.InterestStoryPicker.fb37dad258"); }, video: cityVideo },
  { get chapter() { return __msg("system.chapterPosition", { current: 3, total: 6 }); }, creator: "Lina Moreau", handle: "@lina", get title() { return __msg("system.InterestStoryPicker.86a9dadc21"); }, video: coffeeVideo },
];

function StoryVideo({ active, src }) {
  __useUiLanguage();
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (active) node.play().catch(() => {});
    else node.pause();
  }, [active]);
  return <video className="h-full w-full object-cover" loop muted playsInline preload="metadata" ref={ref} src={src} />;
}

export default function InterestStoryPicker({ busy, categories = [], error, onBack, onContinue, onToggle, selected = [] }) {
  __useUiLanguage();
  const cards = useRef(null);
  const verticalGesture = useRef({ active: false, startY: 0 });
  const wheelChangedAt = useRef(0);
  const [activeCard, setActiveCard] = useState(0);
  const [activeTopic, setActiveTopic] = useState("Travel");
  const [searchOpen, setSearchOpen] = useState(false);
  const [storyPage, setStoryPage] = useState(0);
  const [storyDragY, setStoryDragY] = useState(0);
  const [storyDragging, setStoryDragging] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const topics = useMemo(() => {
    const byName = new Map(categories.map((item) => [item.name, item]));
    const ordered = preferredTopics.map((item) => ({ ...(byName.get(item.id) || item), name: item.name }));
    const preferredIds = new Set(preferredTopics.map((item) => item.id));
    return [...ordered, ...categories.filter((item) => !preferredIds.has(item.id))];
  }, [categories]);
  const topic = topics.find((item) => item.name === activeTopic) || topics[0] || { id: "Travel", name: "Travel" };

  useEffect(() => {
    const node = cards.current;
    if (!node) return undefined;
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const center = node.scrollLeft + node.clientWidth / 2;
        const index = Array.from(node.children).reduce((best, card, cardIndex) => {
          const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
          return distance < best.distance ? { index: cardIndex, distance } : best;
        }, { index: 0, distance: Infinity }).index;
        setActiveCard(index);
      });
    };
    node.addEventListener("scroll", update, { passive: true });
    update();
    return () => { cancelAnimationFrame(frame); node.removeEventListener("scroll", update); };
  }, []);

  const remaining = Math.max(0, 3 - selected.length);
  const topicSelected = selectedSet.has(topic.id);
  const currentStory = stories[storyPage];
  const startVerticalSwipe = (event) => {
    verticalGesture.current = { active: true, startY: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveVerticalSwipe = (event) => {
    if (!verticalGesture.current.active) return;
    const deltaY = event.clientY - verticalGesture.current.startY;
    if (Math.abs(deltaY) < 5) return;
    setStoryDragging(true);
    const atStart = storyPage === 0 && deltaY > 0;
    const atEnd = storyPage === stories.length - 1 && deltaY < 0;
    setStoryDragY((atStart || atEnd) ? deltaY * 0.18 : deltaY);
  };
  const endVerticalSwipe = (event) => {
    if (!verticalGesture.current.active) return;
    const deltaY = event.clientY - verticalGesture.current.startY;
    verticalGesture.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (Math.abs(deltaY) > 55) setStoryPage((value) => Math.max(0, Math.min(stories.length - 1, value + (deltaY < 0 ? 1 : -1))));
    setStoryDragging(false);
    setStoryDragY(0);
  };
  const handleStoryWheel = (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || Math.abs(event.deltaY) < 18) return;
    event.preventDefault();
    const now = Date.now();
    if (now - wheelChangedAt.current < 650) return;
    wheelChangedAt.current = now;
    setStoryPage((value) => Math.max(0, Math.min(stories.length - 1, value + (event.deltaY > 0 ? 1 : -1))));
  };

  return <main className="relative mx-auto flex h-[100dvh] w-full max-w-[475px] flex-col overflow-hidden border-x border-white/[.06] bg-[#050709] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_36%_at_50%_72%,rgba(45,115,177,.12),transparent_72%)]" />
    <header className="relative z-10 px-5 pt-[max(58px,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <button aria-label={__msg("discover.back")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.055] text-lg text-white/85 transition active:scale-95" onClick={onBack} type="button"><FiArrowLeft /></button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full w-[45%] rounded-full bg-[#91C7FF]" /></div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[4px] border-white/[.07] bg-[#10141A] text-sm font-black text-[#9CCBFF]">{selected.length}</div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div><h1 className="text-[24px] font-black leading-none tracking-[-.035em]">{__msg("system.InterestStoryPicker.a041eddb3b")}</h1><p className="mt-1.5 max-w-[340px] text-[13px] leading-5 text-white/78">{__msg("system.InterestStoryPicker.c464ce474c")}</p></div>
        <button aria-label={__msg("system.InterestStoryPicker.5f20fc8cbd")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[.055] text-lg" onClick={() => setSearchOpen((value) => !value)} type="button"><FiSearch /></button>
      </div>
      {searchOpen ? <input autoFocus className="mt-3 w-full rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-[#9CCBFF]/50" placeholder={__msg("system.InterestStoryPicker.5f20fc8cbd")} /> : null}
    </header>

    <nav aria-label={__msg("settings.topics")} className="relative z-10 mt-4 flex shrink-0 gap-5 overflow-x-auto px-5 [scrollbar-width:none]">
      {topics.map((item) => <button className={`whitespace-nowrap border-b-2 pb-1.5 text-[13px] font-black transition ${item.name === topic.name ? "border-[#9CCBFF] text-white" : "border-transparent text-white/34"}`} key={item.id} onClick={() => setActiveTopic(item.name)} type="button">{optionLabel(item.name)}</button>)}
    </nav>

    <section className="relative z-10 mt-2 min-h-0 flex-1 overflow-hidden">
      <div className="flex h-full snap-x snap-mandatory gap-4 overflow-x-auto px-[9.5%] pb-2 [scrollbar-width:none]" ref={cards}>
        {stories.map((tile, index) => <article className="relative h-full min-h-[500px] w-[82vw] max-w-[378px] shrink-0 snap-center touch-pan-x overflow-hidden rounded-[22px] border border-white/10 bg-[#11151A] shadow-[0_24px_55px_rgba(0,0,0,.52)]" key={tile.title} onPointerCancel={endVerticalSwipe} onPointerDown={startVerticalSwipe} onPointerMove={moveVerticalSwipe} onPointerUp={endVerticalSwipe} onWheel={handleStoryWheel}>
          <div className={`absolute inset-x-0 top-0 h-[76%] ${storyDragging ? "" : "transition-transform duration-500 ease-out"}`} style={{ transform: `translateY(calc(${-storyPage * 100}% + ${storyDragY}px))` }}>{stories.map((story, storyIndex) => <div className="h-full w-full" key={story.title}><StoryVideo active={index === activeCard && storyIndex === storyPage} src={story.video} /></div>)}</div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#141211] via-transparent to-black/5" />
          <div className="absolute left-3 right-3 top-3 flex gap-1">{stories.map((item, lineIndex) => <i className={`h-0.5 flex-1 rounded-full transition-colors ${lineIndex <= storyPage ? "bg-white" : "bg-white/30"}`} key={item.title} />)}</div>
          <div className="absolute left-4 right-4 top-7 flex items-center justify-between"><h2 className="text-[24px] font-black tracking-[-.03em]">{optionLabel(topic.name)}</h2><span className="text-xs font-black text-white/60">{storyPage + 1}/{stories.length}</span></div>
          <div className="absolute bottom-4 left-3.5 right-3.5">
            <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.15em] text-white/55">{currentStory.chapter}</p><h3 className="mt-1 text-[14px] font-black">{currentStory.title}</h3></div><button aria-label={`${topicSelected ? __msg("profile.remove") : __msg("publication.add")} ${optionLabel(topic.name)}`} className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border text-[28px] shadow-xl transition active:scale-90 ${topicSelected ? "border-[#9CCBFF] bg-[#9CCBFF] text-[#07101A]" : "border-white/35 bg-white/20 text-white backdrop-blur"}`} onClick={() => onToggle(topic.id)} type="button">{topicSelected ? <FiCheck /> : <FiPlus />}</button></div>
            <div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-gradient-to-br from-amber-200 to-amber-800 text-xs font-black text-black">{__msg("system.InterestStoryPicker.d00bb3f3b7")}</span><span><b className="block text-[14px]">{currentStory.creator}</b><small className="text-[11px] text-white/60">{currentStory.handle}</small></span></div><span className="text-[11px] font-bold">{topicSelected ? __msg("stories.added") : __msg("share.add", { value0: optionLabel(topic.name) })}</span></div>
            <button aria-label={__msg("system.InterestStoryPicker.97fffe18cb")} className="absolute bottom-0 right-0 grid h-10 w-10 translate-y-1/2 place-items-center rounded-full bg-[#17191D] text-lg" type="button"><FiChevronDown /></button>
          </div>
        </article>)}
      </div>
    </section>

    <footer className="relative z-20 px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-3">
      {error ? <p className="mb-2 rounded-xl bg-red-500/10 p-2 text-center text-xs text-red-200">{__systemMessage(error)}</p> : null}
      <button className="w-full rounded-2xl bg-[#9CCBFF] py-4 text-[15px] font-black text-[#07101A] transition active:scale-[.98] disabled:bg-white/[.055] disabled:text-white/55" disabled={remaining > 0 || busy} onClick={onContinue} type="button">{busy ? __msg("financial.saving") : remaining > 0 ? __msg("system.interestsRemaining", { count: remaining }) : __msg("profile.continue")}</button>
    </footer>
  </main>;
}
