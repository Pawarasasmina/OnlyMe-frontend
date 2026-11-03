import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowDown, FiArrowLeft, FiCheck, FiPlus, FiSearch } from "react-icons/fi";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { readPreAuthInterests, writePreAuthInterests } from "../../utils/preAuthOnboarding";

const topics = [
  ["Fitness", "Strong body. Clear mind.", "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=82"],
  ["Travel", "One-way ticket. No plan.", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82"],
  ["Business", "Building something big.", "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=82"],
  ["Psychology", "Why people do what they do.", "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=82"],
  ["Fashion", "Dressed like it matters.", "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82"],
  ["Lifestyle", "Slow mornings, good light.", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=82"],
  ["Beauty", "Skin day. No plans.", "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=82"],
  ["Wellness", "Quiet mind. Strong body.", "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=82"],
  ["Food", "Worth every bite.", "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=82"],
  ["Technology", "Built in code.", "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=82"],
];

export default function PublicInterestsPage() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [selected, setSelected] = useState(readPreAuthInterests);
  const [active, setActive] = useState(0);
  const [queryOpen, setQueryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => topics.filter(([name]) => name.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => writePreAuthInterests(selected), [selected]);
  if (!loading && user) return <Navigate replace to="/onboarding/interests" />;
  const toggle = (name) => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const count = selected.length;

  return <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[470px] flex-col overflow-hidden border-x border-white/[.06] bg-[#080B0F] text-white">
    <header className="z-20 flex items-center gap-3 px-4 pb-3 pt-[max(22px,env(safe-area-inset-top))]"><Link aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.07]" to="/welcome"><FiArrowLeft /></Link>{queryOpen ? <input autoFocus className="h-11 min-w-0 flex-1 rounded-[14px] border border-white/10 bg-white/[.06] px-4 outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search interests" value={query} /> : <div className="min-w-0 flex-1"><h1 className="text-xl font-black">What pulls you in?</h1><p className="text-xs text-white/45">Every interaction is a signal · pick at least 3</p></div>}<button aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.07]" onClick={() => { setQueryOpen((value) => !value); setQuery(""); }} type="button"><FiSearch /></button></header>
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">{visible.map(([name], index) => <button className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${index === active ? "bg-white text-[#0A0C0F]" : "bg-white/[.07] text-white/60"}`} key={name} onClick={() => { setActive(index); trackRef.current?.children[index]?.scrollIntoView({ behavior: "smooth", inline: "center" }); }} type="button">{selected.includes(name) ? "• " : ""}{name}</button>)}</div>
    <div className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-[7%] pb-28 [scrollbar-width:none]" onScroll={(event) => { const width = event.currentTarget.clientWidth * .86 + 12; setActive(Math.round(event.currentTarget.scrollLeft / width)); }} ref={trackRef}>{visible.map(([name, caption, image], index) => { const on = selected.includes(name); return <article className="relative h-[calc(100dvh-190px)] w-[86%] shrink-0 snap-center overflow-hidden rounded-[24px] border border-white/10 bg-[#121821]" key={name}><img alt="" className="absolute inset-0 h-full w-full object-cover" src={image} /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/25" /><div className="absolute bottom-0 left-0 right-0 p-5"><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#9CCBFF]">{name}</p><h2 className="mt-2 text-3xl font-black leading-tight">{caption}</h2><p className="mt-2 text-sm text-white/60">Swipe sideways for another topic. Swipe down to explore more after joining.</p><button aria-pressed={on} className={`mt-5 flex h-12 w-12 items-center justify-center rounded-full border text-xl active:scale-[.97] ${on ? "border-white bg-white text-black" : "border-white/30 bg-black/35"}`} onClick={() => toggle(name)} type="button">{on ? <FiCheck /> : <FiPlus />}</button>{index < visible.length - 1 ? <span className="absolute bottom-6 right-5 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white/60"><FiArrowDown className="-rotate-90" /></span> : null}</div></article>; })}</div>
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#080B0F] via-[#080B0F] to-transparent px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-10"><div className="mb-3 flex items-center gap-3"><span className="relative grid h-10 w-10 place-items-center rounded-full text-sm font-black" style={{ background: `conic-gradient(#9CCBFF ${Math.min(360, count / 3 * 360)}deg, rgba(255,255,255,.12) 0)` }}><i className="absolute inset-[3px] rounded-full bg-[#080B0F]" /><b className="relative">{count}</b></span><p className="text-xs text-white/45">{count >= 3 ? "Your first feed is taking shape" : `${3 - count} more ${3 - count === 1 ? "topic" : "topics"} to continue`}</p></div><button className="w-full rounded-2xl bg-[#9CCBFF] py-4 font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-35" disabled={count < 3} onClick={() => navigate("/login", { state: { fromInterests: true } })} type="button">Continue</button></div>
  </main>;
}
