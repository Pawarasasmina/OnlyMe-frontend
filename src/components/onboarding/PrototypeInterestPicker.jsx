import "./TopicSelection.css";
import { useAuth } from "../../hooks/useAuth";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { msg as __msg } from "../../i18n/runtime.js";
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
  __uiTuple(["Travel", { __uiMessage: "data.travel" }, [__uiTuple(["city", { __uiMessage: "onboarding.parisBefore8am" }, "Lina Moreau", "@lina"]), __uiTuple(["beach", { __uiMessage: "system.InterestStoryPicker.08dd7d3e67" }, "Andre Silva", "@andre"]), __uiTuple(["surf", { __uiMessage: "onboarding.firstWaveAt640" }, "James Carter", "@james"])]]),
  __uiTuple(["Fitness", { __uiMessage: "fan.fitness" }, [__uiTuple(["gym", { __uiMessage: "onboarding.legDayNoShortcuts" }, "Ethan Brooks", "@ethan"]), __uiTuple(["surf", { __uiMessage: "onboarding.cardioWithAView" }, "Dario Conte", "@dario"]), __uiTuple(["beach", { __uiMessage: "onboarding.breatheThroughIt" }, "Nora Wells", "@nora"])]]),
  __uiTuple(["Lifestyle", { __uiMessage: "profile.lifestyle" }, [__uiTuple(["coffee", { __uiMessage: "onboarding.slowSunday" }, "Zoe Miller", "@zoe"]), __uiTuple(["city", { __uiMessage: "onboarding.aDayWithoutPlans" }, "Lina Moreau", "@lina"]), __uiTuple(["beach", { __uiMessage: "onboarding.leaveThePhoneBehind" }, "Elsa Berg", "@elsa"])]]),
  __uiTuple(["Business", { __uiMessage: "profile.business" }, [__uiTuple(["city", { __uiMessage: "onboarding.movingToDubai" }, "Ana Patel", "@ana"]), __uiTuple(["coffee", { __uiMessage: "onboarding.theFirstClientMeeting" }, "Noah King", "@noah"]), __uiTuple(["gym", { __uiMessage: "onboarding.consistencyCompounds" }, "Ethan Brooks", "@ethan"])]]),
  __uiTuple(["Tech", { __uiMessage: "onboarding.tech" }, [__uiTuple(["city", { __uiMessage: "onboarding.technologyInMotion" }, "Noah King", "@noah"]), __uiTuple(["coffee", { __uiMessage: "onboarding.buildingTheNextIdea" }, "Zoe Miller", "@zoe"]), __uiTuple(["gym", { __uiMessage: "onboarding.systemsThatStayReliable" }, "Ethan Brooks", "@ethan"])], "Technology"]),
  __uiTuple(["Psychology", { __uiMessage: "onboarding.psychology" }, [__uiTuple(["beach", { __uiMessage: "onboarding.quietIsProductive" }, "Elsa Berg", "@elsa"]), __uiTuple(["coffee", { __uiMessage: "onboarding.makeSpaceToThink" }, "Zoe Miller", "@zoe"]), __uiTuple(["city", { __uiMessage: "onboarding.confidenceInMotion" }, "Maya Chen", "@maya"])]]),
  __uiTuple(["Fashion", { __uiMessage: "onboarding.fashion" }, [__uiTuple(["fashion", { __uiMessage: "onboarding.tokyoThrifted" }, "Mia Tanaka", "@mia"]), __uiTuple(["city", { __uiMessage: "onboarding.streetStyleAfterDark" }, "Noah King", "@noah"]), __uiTuple(["coffee", { __uiMessage: "onboarding.aSlowerMorning" }, "Zoe Miller", "@zoe"])]]),
  __uiTuple(["Beauty", { __uiMessage: "fan.beauty" }, [__uiTuple(["fashion", { __uiMessage: "onboarding.fiveMinuteGlow" }, "Mia Tanaka", "@mia"]), __uiTuple(["coffee", { __uiMessage: "onboarding.theMorningRitual" }, "Zoe Miller", "@zoe"]), __uiTuple(["beach", { __uiMessage: "onboarding.saltSunRepeat" }, "Elsa Berg", "@elsa"])]]),
  __uiTuple(["Wellness", { __uiMessage: "data.wellness" }, [__uiTuple(["beach", { __uiMessage: "onboarding.breatheWithTheTide" }, "Elsa Berg", "@elsa"]), __uiTuple(["surf", { __uiMessage: "onboarding.coldWaterClarity" }, "James Carter", "@james"]), __uiTuple(["coffee", { __uiMessage: "onboarding.aQuieterStart" }, "Zoe Miller", "@zoe"])]]),
  __uiTuple(["Food", { __uiMessage: "fanWeb.food" }, [__uiTuple(["food", { __uiMessage: "onboarding.cacioEPepeProperly" }, "Luca Romano", "@luca"]), __uiTuple(["coffee", { __uiMessage: "onboarding.theCupWorthFinding" }, "Zoe Miller", "@zoe"]), __uiTuple(["city", { __uiMessage: "onboarding.dinnerAfterMidnight" }, "Maya Chen", "@maya"])]]),
];

function StoryMedia({ image, play, src }) {
  __useUiLanguage();
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

function StoryCard({ active, added, index, onToggle, story, topic, total, showSwipeCue, onNext, busy }) {
  __useUiLanguage();
  const { avatar, creator, handle, image, source, title } = story;
  const buttonRef = useRef(null);
  const previousAdded = useRef(added);
  useEffect(() => {
    const changed = previousAdded.current !== added;
    previousAdded.current = added;
    if (!changed || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const animation = buttonRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: .4 }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.2,.7,0,1)" });
    return () => animation?.cancel();
  }, [added]);
  return <article data-topic={topic.id} data-clip-id={story.id} data-added={added} className={`interest-topic-card ${added ? "is-added" : ""} relative h-full min-h-full shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/10 bg-[#13171B] shadow-[0_20px_48px_rgba(0,0,0,.52)]`}>
    <StoryMedia image={image} play={active} src={source} />
    <div className="absolute inset-0 bg-gradient-to-t from-[#151311] via-transparent to-black/10" />
    {showSwipeCue ? <span aria-hidden="true" className="interest-swipe-cue"><FiChevronDown /></span> : null}
    <div className="absolute left-3 right-3 top-3 flex gap-1">{Array.from({ length: total }, (_, line) => <i className={`h-0.5 flex-1 rounded-full ${line <= index ? "bg-white" : "bg-white/30"}`} key={line} />)}</div>
    <div className="absolute left-4 right-4 top-7 flex justify-between"><h2 className="text-[24px] font-black tracking-[-.035em]">{topic.name}</h2><b className="text-xs text-white/60">{index + 1}/{total}</b></div>
    <div className="absolute bottom-4 left-3.5 right-3.5">
      <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black tracking-[.16em] text-white/55">{__msg("system.chapterPosition", { current: index + 1, total })}</p><h3 className="mt-1 text-[14px] font-black">{title}</h3></div><button ref={buttonRef} disabled={busy} aria-pressed={added} aria-label={`${added ? __msg("profile.remove") : __msg("publication.add")} ${topic.name}`} className={`grid h-14 w-14 place-items-center rounded-full border text-[28px] shadow-xl active:scale-90 ${added ? "border-[#9CCBFF] bg-[#9CCBFF] text-[#07101A]" : "border-white/35 bg-white/20 backdrop-blur"}`} onClick={(event) => { event.stopPropagation(); onToggle(); }} type="button">{added ? <FiCheck /> : <FiPlus />}</button></div>
      <div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-10 w-10 overflow-hidden rounded-full border border-white/25 bg-gradient-to-br from-amber-100 to-amber-700 text-xs font-black text-black">{avatar ? <img alt="" className="h-full w-full object-cover" src={avatar} /> : <i className="m-auto not-italic">{creator.split(" ").map((part) => part[0]).join("")}</i>}</span><span><b className="block text-[14px]">{creator}</b><small className="text-[11px] text-white/60">{handle}</small></span></div><small className="font-bold">{added ? __msg("stories.added") : __msg("share.add", { value0: topic.name })}</small></div>
      <button aria-label={__msg("social.nextChapter")} disabled={index >= total - 1} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onNext(); }} className="absolute bottom-0 right-0 grid h-9 w-9 translate-y-1/2 place-items-center rounded-full bg-[#17191D] disabled:opacity-30" type="button"><FiChevronDown /></button>
    </div>
  </article>;
}

function TopicColumn({ active, selectedClips, onToggle, topic, showSwipeCue, onExplore, busy }) {
  __useUiLanguage();
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
    if (next !== storyIndex) onExplore();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { node.scrollTop = target; setStoryIndex(next); return; }
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
      {topic.stories.map((story, index) => <StoryCard active={active && index === storyIndex} added={selectedClips.has(story.id)} busy={busy} showSwipeCue={active && index === storyIndex && showSwipeCue && index < topic.stories.length - 1} onNext={() => glide(index + 1)} index={index} key={`${topic.id}-${story.id}`} onToggle={() => onToggle(story.id)} story={story} topic={topic} total={topic.stories.length} />)}
    </div>
  </div>;
}

export default function PrototypeInterestPicker({ busy, categories = [], error, onBack, onContinue, onToggle, selected = [] }) {
  const { language: __uiLanguage } = __useUiLanguage();
  const { user } = useAuth();
  const storageKey = `atseen:interest-clips:v1:${user?.id || user?._id || "preauth"}`;
  const readClips = key => { try { const value = JSON.parse(localStorage.getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } };
  const [clipState, setClipState] = useState(() => ({ key: storageKey, values: readClips(storageKey) }));
  const clipSelections = clipState.key === storageKey ? clipState.values : {};
  const [verticalExplored, setVerticalExplored] = useState(false);
  useEffect(() => { setClipState(current => current.key === storageKey ? current : { key: storageKey, values: readClips(storageKey) }); }, [storageKey]);
  useEffect(() => { if (clipState.key === storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(clipState.values)); } catch { /* Selection remains available in memory. */ } } }, [clipState, storageKey]);
  const track = useRef(null);
  const horizontalDrag = useRef({ active: false, axis: null, pointerId: null, startScroll: 0, startX: 0, startY: 0 });
  const horizontalAnimation = useRef(null);
  const advanceTimer = useRef(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [publishedSeens, setPublishedSeens] = useState([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const topicTabs = useRef(null);
  const previousTopics = useRef(selectedSet);
  useEffect(() => {
    const previous = previousTopics.current;
    previousTopics.current = selectedSet;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const animations = [...(topicTabs.current?.querySelectorAll("[data-topic-interest]") || [])]
      .filter(tab => selectedSet.has(tab.dataset.topicInterest) && !previous.has(tab.dataset.topicInterest))
      .map(tab => tab.animate([{ transform: "scale(.96)" }, { transform: "scale(1.03)", offset: .55 }, { transform: "scale(1)" }], { duration: 300, easing: "ease" }));
    return () => animations.forEach(animation => animation.cancel());
  }, [selectedSet]);
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
        id: String(item.id || item._id || source), avatar: resolveMediaUrl(item.creator?.avatar || ""), creator: item.creator?.name || item.creator?.username || __msg("onboarding.seenCreator"),
        handle: item.creator?.username ? `@${item.creator.username}` : "@seen", image, source, title: item.title || "A Seen worth watching",
      } : null;
    }).filter(Boolean);
    const localStories = fallbackStories.map(([mediaKey, title, creator, handle]) => ({ id: `local:${mediaKey}`, creator, handle, image: false, source: media[mediaKey], title }));
    return { id, name, savedInterest, stories: [...realStories, ...localStories].slice(0, 3) };
  }).filter((item) => !allowed.size || allowed.has(item.savedInterest)), [allowed, publishedSeens, __uiLanguage]);
  const normalizedQuery = query.trim().toLowerCase();
  const displayedTopics = normalizedQuery ? topics.filter((item) => item.name.toLowerCase().includes(normalizedQuery) || item.stories.some((story) => [story.title, story.creator, story.handle].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)))) : topics;
  const glideToTopic = (index) => {
    const node = track.current;
    if (!node) return;
    clearTimeout(advanceTimer.current);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { const next = Math.max(0, Math.min(displayedTopics.length - 1, index)); node.scrollLeft = next * node.clientWidth * (__uiLanguage === "ar" ? -1 : 1); setActive(next); return; }
    const from = node.scrollLeft;
    const to = Math.max(0, Math.min(displayedTopics.length - 1, index)) * node.clientWidth * (__uiLanguage === "ar" ? -1 : 1);
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
    clearTimeout(advanceTimer.current);
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
      glideToTopic(Math.round(Math.abs(node.scrollLeft) / Math.max(node.clientWidth, 1)));
    }
  };
  const selectedClipsFor = topic => {
    if (!selectedSet.has(topic.savedInterest)) return new Set();
    const saved = clipSelections[topic.savedInterest];
    const available = Array.isArray(saved) ? saved.filter(id => topic.stories.some(story => story.id === id)) : [];
    return new Set(available.length ? available : [topic.stories[0]?.id].filter(Boolean));
  };
  const toggleAndAdvance = (topic, index, clipId) => {
    const clips = selectedClipsFor(topic);
    const wasTopicSelected = selectedSet.has(topic.savedInterest);
    const wasClipSelected = clips.has(clipId);
    if (wasClipSelected) clips.delete(clipId); else clips.add(clipId);
    setClipState(current => ({ key: storageKey, values: { ...(current.key === storageKey ? current.values : {}), [topic.savedInterest]: [...clips] } }));
    if (Boolean(clips.size) !== wasTopicSelected) onToggle(topic.savedInterest);
    clearTimeout(advanceTimer.current);
    if (!wasClipSelected && !wasTopicSelected && selectedSet.size + 1 < 3 && index < displayedTopics.length - 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      advanceTimer.current = setTimeout(() => glideToTopic(index + 1), 520);
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
  useEffect(() => {
    cancelAnimationFrame(horizontalAnimation.current);
    const node = track.current;
    if (node) node.scrollLeft = activeRef.current * node.clientWidth * (__uiLanguage === "ar" ? -1 : 1);
  }, [__uiLanguage]);
  const remaining = Math.max(0, 3 - selectedSet.size);

  return <main className="relative mx-auto flex h-[100dvh] w-full max-w-[475px] flex-col overflow-hidden border-x border-white/[.06] bg-[#050709] text-white">
    <header className="relative z-10 px-4 pt-[max(18px,env(safe-area-inset-top))] sm:px-5 sm:pt-[max(32px,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3"><button aria-label={__msg("discover.back")} className="grid h-10 w-10 place-items-center rounded-full bg-white/[.055] text-lg" onClick={onBack} type="button"><FiArrowLeft /></button><div className="h-2 flex-1 rounded-full bg-white/[.07]"><div className="h-full w-[45%] rounded-full bg-[#91C7FF]" /></div><div aria-label={__msg("system.PrototypeInterestPicker.a3d2993642", { value0: selectedSet.size })} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#91C7FF ${Math.min(360, selectedSet.size / 3 * 360)}deg, rgba(255,255,255,.08) 0deg)` }}><span className="absolute inset-[4px] rounded-full bg-[#10141A]" /><b className="relative text-sm text-[#9CCBFF]">{selectedSet.size}</b></div></div>
      <div className="interest-heading-row">
        {searching ? <>
          <div className="interest-search-field"><input autoFocus aria-label={__msg("system.PrototypeInterestPicker.2d0f26bdac")} onChange={(event) => setQuery(event.target.value)} placeholder={__msg("system.PrototypeInterestPicker.2d0f26bdac")} value={query} /></div>
          <button aria-label={__msg("system.PrototypeInterestPicker.0906f92324")} className="interest-search-close" onClick={() => { setSearching(false); setQuery(""); }} type="button"><FiX /></button>
        </> : <>
          <div className="interest-heading-copy"><h1>{__msg("system.InterestStoryPicker.a041eddb3b")}</h1><p>{__msg("system.InterestStoryPicker.c464ce474c")}</p></div>
          <button aria-label={__msg("discover.search")} className="interest-search-open" onClick={() => setSearching(true)} type="button"><FiSearch /></button>
        </>}
      </div>
    </header>
    <nav ref={topicTabs} className="interest-topic-tabs relative z-10">{displayedTopics.map((topic) => <button data-topic-interest={topic.savedInterest} aria-current={displayedTopics[active]?.id === topic.id ? "true" : undefined} aria-pressed={selectedSet.has(topic.savedInterest)} className="interest-topic-tab" key={topic.id} onClick={() => openTopic(topic)} type="button">{selectedSet.has(topic.savedInterest) ? <i aria-hidden="true" className="interest-topic-selected-dot" /> : null}{topic.name}</button>)}</nav>
    <section className="relative z-10 min-h-0 flex-1 overflow-hidden">{displayedTopics.length ? <div dir={__uiLanguage === "ar" ? "rtl" : "ltr"} className="flex h-full touch-pan-y overflow-x-auto [scrollbar-width:none]" onPointerCancel={endHorizontalDrag} onPointerDown={startHorizontalDrag} onPointerMove={moveHorizontalDrag} onPointerUp={endHorizontalDrag} onScroll={(event) => setActive(Math.round(Math.abs(event.currentTarget.scrollLeft) / Math.max(event.currentTarget.clientWidth, 1)))} ref={track}>{displayedTopics.map((topic, index) => <TopicColumn active={active === index} selectedClips={selectedClipsFor(topic)} busy={busy} showSwipeCue={!verticalExplored} onExplore={() => setVerticalExplored(true)} key={topic.id} onToggle={clipId => toggleAndAdvance(topic, index, clipId)} topic={topic} />)}</div> : <div className="grid h-full place-items-center px-8 text-center"><div><FiSearch className="mx-auto text-2xl text-white/25" /><p className="mt-3 text-sm font-bold text-white/55">{__msg("system.PrototypeInterestPicker.212d9fc9db")}</p><button className="mt-3 text-xs font-black text-[#9CCBFF]" onClick={() => setQuery("")} type="button">{__msg("search.clearSearch")}</button></div></div>}</section>
    <footer className="relative z-20 bg-[#050709] px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-[max(16px,env(safe-area-inset-bottom))]">{error ? <p className="mb-2 text-center text-xs text-red-200">{__systemMessage(error)}</p> : null}<button className="w-full rounded-2xl bg-[#9CCBFF] py-3.5 text-[14px] font-black text-[#07101A] disabled:bg-white/[.055] disabled:text-white/55 sm:py-4 sm:text-[15px]" disabled={remaining > 0 || busy} onClick={onContinue} type="button">{busy ? __msg("financial.saving") : remaining ? __msg("system.interestsRemaining", { count: remaining }) : <>{__msg("profile.continue")} <span className="text-[#183A5B]">· {__msg("system.interestsSelected", { count: selectedSet.size })}</span></>}</button></footer>
  </main>;
}
