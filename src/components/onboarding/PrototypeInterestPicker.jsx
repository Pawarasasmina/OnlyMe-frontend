import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiCheck, FiChevronDown, FiPlus, FiSearch, FiX } from "react-icons/fi";
import beach from "../../assets/videos/beach.mp4";
import city from "../../assets/videos/city.mp4";
import coffee from "../../assets/videos/coffee.mp4";
import fashion from "../../assets/videos/fashion.mp4";
import food from "../../assets/videos/food.mp4";
import gym from "../../assets/videos/gym.mp4";
import surf from "../../assets/videos/surf.mp4";
import { publicationService } from "../../services/publicationService";
import { resolveMediaUrl } from "../../utils/media";

const media = { beach, city, coffee, fashion, food, gym, surf };
const definitions = [
  ["Travel", "Travel", [["city", "Paris before 8am", "Lina Moreau", "@lina"], ["beach", "The cove nobody posts", "Andre Silva", "@andre"], ["surf", "First wave at 6:40", "James Carter", "@james"]]],
  ["Fitness", "Fitness", [["gym", "Leg day. No shortcuts.", "Ethan Brooks", "@ethan"], ["surf", "Cardio with a view", "Dario Conte", "@dario"], ["beach", "Breathe through it", "Nora Wells", "@nora"]]],
  ["Lifestyle", "Lifestyle", [["coffee", "Slow Sunday", "Zoe Miller", "@zoe"], ["city", "A day without plans", "Lina Moreau", "@lina"], ["beach", "Leave the phone behind", "Elsa Berg", "@elsa"]]],
  ["Business", "Business", [["city", "Moving to Dubai", "Ana Patel", "@ana"], ["coffee", "The first client meeting", "Noah King", "@noah"], ["gym", "Consistency compounds", "Ethan Brooks", "@ethan"]]],
  ["Tech", "Tech", [["city", "Technology in motion", "Noah King", "@noah"], ["coffee", "Building the next idea", "Zoe Miller", "@zoe"], ["gym", "Systems that stay reliable", "Ethan Brooks", "@ethan"]], "Technology"],
  ["Psychology", "Psychology", [["beach", "Quiet is productive", "Elsa Berg", "@elsa"], ["coffee", "Make space to think", "Zoe Miller", "@zoe"], ["city", "Confidence in motion", "Maya Chen", "@maya"]]],
  ["Fashion", "Fashion", [["fashion", "Tokyo, thrifted", "Mia Tanaka", "@mia"], ["city", "Street style after dark", "Noah King", "@noah"], ["coffee", "A slower morning", "Zoe Miller", "@zoe"]]],
  ["Beauty", "Beauty", [["fashion", "Five-minute glow", "Mia Tanaka", "@mia"], ["coffee", "The morning ritual", "Zoe Miller", "@zoe"], ["beach", "Salt, sun, repeat", "Elsa Berg", "@elsa"]]],
  ["Wellness", "Wellness", [["beach", "Breathe with the tide", "Elsa Berg", "@elsa"], ["surf", "Cold water clarity", "James Carter", "@james"], ["coffee", "A quieter start", "Zoe Miller", "@zoe"]]],
  ["Food", "Food", [["food", "Cacio e pepe, properly", "Luca Romano", "@luca"], ["coffee", "The cup worth finding", "Zoe Miller", "@zoe"], ["city", "Dinner after midnight", "Maya Chen", "@maya"]]],
];

function StoryMedia({ image, play, src }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || image) return;
    if (play) node.play().catch(() => {}); else node.pause();
  }, [image, play]);
  return image
    ? <img alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" src={src} />
    : <video className="absolute inset-0 h-full w-full object-cover" loop muted playsInline preload="metadata" ref={ref} src={src} />;
}

function StoryCard({ active, added, index, onToggle, story, topic, total }) {
  const { avatar, creator, handle, image, source, title } = story;
  return <article className="relative h-full min-h-full shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/10 bg-[#13171B] shadow-[0_20px_48px_rgba(0,0,0,.52)]">
    <StoryMedia image={image} play={active} src={source} />
    <div className="absolute inset-0 bg-gradient-to-t from-[#151311] via-transparent to-black/10" />
    <div className="absolute left-3 right-3 top-3 flex gap-1">{Array.from({ length: total }, (_, line) => <i className={`h-0.5 flex-1 rounded-full ${line <= index ? "bg-white" : "bg-white/30"}`} key={line} />)}</div>
    <div className="absolute left-4 right-4 top-7 flex justify-between"><h2 className="text-[24px] font-black tracking-[-.035em]">{topic.name}</h2><b className="text-xs text-white/60">{index + 1}/{total}</b></div>
    <div className="absolute bottom-4 left-3.5 right-3.5">
      <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black tracking-[.16em] text-white/55">CHAPTER {index + 1} OF 6</p><h3 className="mt-1 text-[14px] font-black">{title}</h3></div><button aria-label={`${added ? "Remove" : "Add"} ${topic.name}`} className={`grid h-14 w-14 place-items-center rounded-full border text-[28px] shadow-xl active:scale-90 ${added ? "border-[#9CCBFF] bg-[#9CCBFF] text-[#07101A]" : "border-white/35 bg-white/20 backdrop-blur"}`} onClick={onToggle} type="button">{added ? <FiCheck /> : <FiPlus />}</button></div>
      <div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-10 w-10 overflow-hidden rounded-full border border-white/25 bg-gradient-to-br from-amber-100 to-amber-700 text-xs font-black text-black">{avatar ? <img alt="" className="h-full w-full object-cover" src={avatar} /> : <i className="m-auto not-italic">{creator.split(" ").map((part) => part[0]).join("")}</i>}</span><span><b className="block text-[14px]">{creator}</b><small className="text-[11px] text-white/60">{handle}</small></span></div><small className="font-bold">{added ? "Added" : `Add ${topic.name}`}</small></div>
      <span className="absolute bottom-0 right-0 grid h-9 w-9 translate-y-1/2 place-items-center rounded-full bg-[#17191D]"><FiChevronDown /></span>
    </div>
  </article>;
}

function TopicColumn({ active, added, onToggle, topic }) {
  const [storyIndex, setStoryIndex] = useState(0);
  const ref = useRef(null);
  const stack = useRef(null);
  const drag = useRef({ active: false, axis: null, startScroll: 0, startX: 0, startY: 0 });
  const animation = useRef(null);
  const wheelAt = useRef(0);
  const glide = (nextIndex) => {
    const node = ref.current;
    const card = stack.current?.children[nextIndex];
    if (!node || !card) return;
    const next = Math.max(0, Math.min(topic.stories.length - 1, nextIndex));
    const target = stack.current.children[next]?.offsetTop || 0;
    const from = node.scrollTop;
    const started = performance.now();
    cancelAnimationFrame(animation.current);
    const animate = (now) => {
      const progress = Math.min(1, (now - started) / 540);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
      node.scrollTop = from + (target - from) * eased;
      if (progress < 1) animation.current = requestAnimationFrame(animate);
    };
    setStoryIndex(next);
    animation.current = requestAnimationFrame(animate);
  };
  const start = (event) => {
    cancelAnimationFrame(animation.current);
    drag.current = { active: true, axis: null, startScroll: ref.current?.scrollTop || 0, startX: event.clientX, startY: event.clientY };
  };
  const move = (event) => {
    const gesture = drag.current;
    const node = ref.current;
    if (!gesture.active || !node) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 6) {
      gesture.axis = Math.abs(deltaY) > Math.abs(deltaX) ? "y" : "x";
      if (gesture.axis === "y") node.setPointerCapture?.(event.pointerId);
    }
    if (gesture.axis === "y") {
      event.preventDefault();
      const atStart = storyIndex === 0 && deltaY > 0;
      const atEnd = storyIndex === topic.stories.length - 1 && deltaY < 0;
      node.scrollTop = gesture.startScroll - ((atStart || atEnd) ? deltaY * 0.18 : deltaY);
    }
  };
  const end = (event) => {
    const gesture = drag.current;
    if (!gesture.active) return;
    gesture.active = false;
    if (gesture.axis !== "y") return;
    ref.current?.releasePointerCapture?.(event.pointerId);
    const deltaY = event.clientY - gesture.startY;
    glide(Math.abs(deltaY) > 50 ? storyIndex + (deltaY < 0 ? 1 : -1) : storyIndex);
  };
  const wheel = (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || Math.abs(event.deltaY) < 15) return;
    event.preventDefault();
    const now = Date.now();
    if (now - wheelAt.current < 650) return;
    wheelAt.current = now;
    glide(storyIndex + (event.deltaY > 0 ? 1 : -1));
  };
  useEffect(() => () => cancelAnimationFrame(animation.current), []);
  return <div className="h-full min-h-0 min-w-full touch-none overflow-y-hidden px-[clamp(12px,5vw,34px)] [scrollbar-width:none]" onPointerCancel={end} onPointerDown={start} onPointerMove={move} onPointerUp={end} onWheel={wheel} ref={ref}>
    <div className="flex h-full min-h-full flex-col gap-3 pb-2" ref={stack}>
      {topic.stories.map((story, index) => <StoryCard active={active && index === storyIndex} added={added} index={index} key={`${topic.id}-${story.source}-${index}`} onToggle={onToggle} story={story} topic={topic} total={topic.stories.length} />)}
    </div>
  </div>;
}

export default function PrototypeInterestPicker({ busy, categories = [], error, onBack, onContinue, onToggle, selected = [] }) {
  const track = useRef(null);
  const horizontalDrag = useRef({ active: false, axis: null, pointerId: null, startScroll: 0, startX: 0, startY: 0 });
  const horizontalAnimation = useRef(null);
  const advanceTimer = useRef(null);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [publishedSeens, setPublishedSeens] = useState([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allowed = useMemo(() => new Set(categories.map((item) => item.id)), [categories]);
  useEffect(() => {
    let current = true;
    Promise.all(definitions.map(([category]) => publicationService.listPublishedSeens({ category, limit: 3, page: 1, tab: "for_you" })))
      .then((responses) => { if (current) setPublishedSeens(responses.flatMap((response) => response.data?.data?.items || [])); })
      .catch(() => { if (current) setPublishedSeens([]); });
    return () => { current = false; };
  }, []);
  const topics = useMemo(() => definitions.map(([id, name, fallbackStories, savedInterest = id]) => {
    const realStories = publishedSeens.filter((item) => String(item.category || "").toLowerCase() === id.toLowerCase()).map((item) => {
      const cover = item.coverMedia || {};
      const source = resolveMediaUrl(cover.secureUrl || cover.playbackUrl || cover.url || cover.thumbnailUrl || "");
      const image = !["VIDEO", "video"].includes(cover.mediaType || cover.resourceType) && !/\.(mp4|webm|mov)(\?|$)/i.test(source);
      return source ? {
        avatar: resolveMediaUrl(item.creator?.avatar || ""), creator: item.creator?.name || item.creator?.username || "@seen creator",
        handle: item.creator?.username ? `@${item.creator.username}` : "@seen", image, source, title: item.title || "A Seen worth watching",
      } : null;
    }).filter(Boolean);
    const localStories = fallbackStories.map(([mediaKey, title, creator, handle]) => ({ creator, handle, image: false, source: media[mediaKey], title }));
    return { id, name, savedInterest, stories: [...realStories, ...localStories].slice(0, 3) };
  }).filter((item) => !allowed.size || allowed.has(item.savedInterest)), [allowed, publishedSeens]);
  const normalizedQuery = query.trim().toLowerCase();
  const displayedTopics = normalizedQuery ? topics.filter((item) => item.name.toLowerCase().includes(normalizedQuery) || item.stories.some((story) => [story.title, story.creator, story.handle].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)))) : topics;
  const glideToTopic = (index) => {
    const node = track.current;
    if (!node) return;
    const from = node.scrollLeft;
    const to = Math.max(0, Math.min(displayedTopics.length - 1, index)) * node.clientWidth;
    const started = performance.now();
    cancelAnimationFrame(horizontalAnimation.current);
    const animate = (now) => {
      const progress = Math.min(1, (now - started) / 620);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
      node.scrollLeft = from + (to - from) * eased;
      if (progress < 1) horizontalAnimation.current = requestAnimationFrame(animate);
    };
    horizontalAnimation.current = requestAnimationFrame(animate);
    setActive(Math.max(0, Math.min(displayedTopics.length - 1, index)));
  };
  const openTopic = (topic) => {
    const index = displayedTopics.findIndex((item) => item.id === topic.id);
    glideToTopic(index);
  };
  const startHorizontalDrag = (event) => {
    cancelAnimationFrame(horizontalAnimation.current);
    horizontalDrag.current = { active: true, axis: null, pointerId: event.pointerId, startScroll: track.current?.scrollLeft || 0, startX: event.clientX, startY: event.clientY };
  };
  const moveHorizontalDrag = (event) => {
    const drag = horizontalDrag.current;
    const node = track.current;
    if (!drag.active || !node) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 6) {
      drag.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
      if (drag.axis === "x") node.setPointerCapture?.(event.pointerId);
    }
    if (drag.axis === "x") {
      event.preventDefault();
      node.scrollLeft = drag.startScroll - deltaX;
    }
  };
  const endHorizontalDrag = () => {
    const drag = horizontalDrag.current;
    const node = track.current;
    if (!drag.active || !node) return;
    drag.active = false;
    if (drag.axis === "x") {
      node.releasePointerCapture?.(drag.pointerId);
      glideToTopic(Math.round(node.scrollLeft / Math.max(node.clientWidth, 1)));
    }
  };
  const toggleAndAdvance = (topic, index) => {
    const alreadySelected = selectedSet.has(topic.savedInterest);
    onToggle(topic.savedInterest);
    clearTimeout(advanceTimer.current);
    if (!alreadySelected && index < displayedTopics.length - 1) {
      advanceTimer.current = setTimeout(() => glideToTopic(index + 1), 320);
    }
  };
  useEffect(() => () => {
    cancelAnimationFrame(horizontalAnimation.current);
    clearTimeout(advanceTimer.current);
  }, []);
  useEffect(() => {
    setActive(0);
    if (track.current) track.current.scrollLeft = 0;
  }, [normalizedQuery, searching]);
  const remaining = Math.max(0, 3 - selected.length);

  return <main className="relative mx-auto flex h-[100dvh] w-full max-w-[475px] flex-col overflow-hidden border-x border-white/[.06] bg-[#050709] text-white">
    <header className="relative z-10 px-4 pt-[max(18px,env(safe-area-inset-top))] sm:px-5 sm:pt-[max(32px,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3"><button aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.055] text-lg" onClick={onBack} type="button"><FiArrowLeft /></button><div className="h-2 flex-1 rounded-full bg-white/[.07]"><div className="h-full w-[45%] rounded-full bg-[#91C7FF]" /></div><div aria-label={`${selected.length} of 3 topics selected`} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#91C7FF ${Math.min(360, selected.length / 3 * 360)}deg, rgba(255,255,255,.08) 0deg)` }}><span className="absolute inset-[4px] rounded-full bg-[#10141A]" /><b className="relative text-sm text-[#9CCBFF]">{selected.length}</b></div></div>
      {searching ? <div className="mt-3 flex h-11 items-center rounded-xl border border-white/[.06] bg-white/[.045] px-3"><FiSearch className="shrink-0 text-white/35" /><input autoFocus className="min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-white/28" onChange={(event) => setQuery(event.target.value)} placeholder="Search topics or creators" value={query} /><button aria-label="Close search" className="grid h-8 w-8 place-items-center rounded-full text-white/55 hover:bg-white/[.06]" onClick={() => { setSearching(false); setQuery(""); }} type="button"><FiX /></button></div> : <div className="mt-3 flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-[22px] font-black leading-none tracking-[-.035em] sm:text-[24px]">Build your Seen</h1><p className="mt-1.5 max-w-[340px] text-[12px] leading-[1.45] text-white/70 sm:text-[13px] sm:leading-5">Sideways for topics, down for more. Tap + on what you’d watch.</p></div><button aria-label="Search" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[.055] text-lg sm:h-11 sm:w-11" onClick={() => setSearching(true)} type="button"><FiSearch /></button></div>}
    </header>
    <nav className="relative z-10 mt-3 flex min-h-[28px] gap-5 overflow-x-auto px-4 sm:px-5 [scrollbar-width:none]">{displayedTopics.map((topic) => <button className={`shrink-0 border-b-2 pb-1.5 text-[13px] font-black ${displayedTopics[active]?.id === topic.id ? "border-[#9CCBFF] text-white" : "border-transparent text-white/38"}`} key={topic.id} onClick={() => openTopic(topic)} type="button">{topic.name}</button>)}</nav>
    <section className="relative z-10 mt-2 min-h-0 flex-1 overflow-hidden">{displayedTopics.length ? <div className="flex h-full touch-pan-y overflow-x-auto [scrollbar-width:none]" onPointerCancel={endHorizontalDrag} onPointerDown={startHorizontalDrag} onPointerMove={moveHorizontalDrag} onPointerUp={endHorizontalDrag} onScroll={(event) => setActive(Math.round(event.currentTarget.scrollLeft / Math.max(event.currentTarget.clientWidth, 1)))} ref={track}>{displayedTopics.map((topic, index) => <TopicColumn active={active === index} added={selectedSet.has(topic.savedInterest)} key={topic.id} onToggle={() => toggleAndAdvance(topic, index)} topic={topic} />)}</div> : <div className="grid h-full place-items-center px-8 text-center"><div><FiSearch className="mx-auto text-2xl text-white/25" /><p className="mt-3 text-sm font-bold text-white/55">No matching topics or creators</p><button className="mt-3 text-xs font-black text-[#9CCBFF]" onClick={() => setQuery("")} type="button">Clear search</button></div></div>}</section>
    <footer className="relative z-20 bg-[#050709] px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-[max(16px,env(safe-area-inset-bottom))]">{error ? <p className="mb-2 text-center text-xs text-red-200">{error}</p> : null}<button className="w-full rounded-2xl bg-[#9CCBFF] py-3.5 text-[14px] font-black text-[#07101A] disabled:bg-white/[.055] disabled:text-white/55 sm:py-4 sm:text-[15px]" disabled={remaining > 0 || busy} onClick={onContinue} type="button">{busy ? "Saving…" : remaining ? `Add ${remaining} topic${remaining === 1 ? "" : "s"} to continue` : <>Continue <span className="text-[#183A5B]">· {selected.length} topics</span></>}</button></footer>
  </main>;
}
