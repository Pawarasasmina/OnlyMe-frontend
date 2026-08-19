import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useOnboarding } from "../../hooks/useOnboarding";
import { useLanguage } from "../../hooks/useLanguage";
import { normalizeApiError } from "../../utils/apiErrors";

const PURPOSES = [
  ["watch", "Watch real lives", "Beautiful, honest, no filters"],
  ["learn", "Learn from people", "Routines, crafts, how they did it"],
  ["nearby", "Find my people nearby", "Same city, real places"],
  ["build", "Build and earn myself", "Creator tools first"],
];
const LANGUAGES = [["en", "English"], ["ar", "العربية"], ["ru", "Русский"], ["es", "Español"], ["fr", "Français"], ["pt", "Português"]];
const STORAGE_KEY = "atseen_content_preferences";

function readLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export default function ContentPreferencesPage() {
  const onboarding = useOnboarding();
  const { language, setLanguage } = useLanguage();
  const initialized = useRef(false);
  const [purposes, setPurposes] = useState([]);
  const [languages, setLanguages] = useState([language]);
  const [city, setCity] = useState("");
  const [topicStates, setTopicStates] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!onboarding.data || initialized.current) return;
    initialized.current = true;
    const local = readLocal();
    const selected = new Set(onboarding.data.profile?.interests || []);
    const storedStates = local.topicStates || {};
    setTopicStates(Object.fromEntries((onboarding.data.categories || []).map((item) => [item.id, selected.has(item.id) ? 1 : storedStates[item.id] === -1 ? -1 : 0])));
    setPurposes(Array.isArray(local.purposes) ? local.purposes.slice(0, 2) : ["watch"]);
    setLanguages(Array.isArray(local.languages) && local.languages.length ? local.languages : [language]);
    setCity(local.city || onboarding.data.profile?.city || "");
  }, [language, onboarding.data]);

  const categories = onboarding.data?.categories || [];
  const selectedTopics = useMemo(() => Object.entries(topicStates).filter(([, value]) => value === 1).map(([key]) => key), [topicStates]);
  const saving = onboarding.saveInterests.isPending || onboarding.saveInstincts.isPending;

  const togglePurpose = (key) => setPurposes((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key].slice(-2));
  const toggleLanguage = (key) => setLanguages((current) => current.includes(key) ? (current.length === 1 ? current : current.filter((item) => item !== key)) : [...current, key]);
  const cycleTopic = (key) => setTopicStates((current) => ({ ...current, [key]: current[key] === 1 ? -1 : current[key] === -1 ? 0 : 1 }));

  const save = async () => {
    if (selectedTopics.length < 3) return setError("Choose at least 3 topics you want to see more often.");
    if (selectedTopics.length > 8) return setError("Choose up to 8 topics.");
    setError("");
    setMessage("");
    const current = onboarding.data?.profile?.discoveryPreferences || {};
    const nextPreferences = {
      ...current,
      contentDepth: purposes.includes("watch") ? "quick" : current.contentDepth || "both",
      creatorStyle: purposes.includes("learn") ? "educational" : purposes.includes("build") ? "practical" : current.creatorStyle || "any",
      discoveryRange: purposes.includes("nearby") ? "city" : current.discoveryRange || "global",
    };
    try {
      await onboarding.saveInterests.mutateAsync(selectedTopics);
      await onboarding.saveInstincts.mutateAsync(nextPreferences);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ city: city.trim(), languages, purposes, topicStates }));
      if (languages[0]) setLanguage(languages[0]);
      setMessage("Content preferences saved.");
    } catch (requestError) {
      setError(normalizeApiError(requestError, "Unable to save content preferences.").message);
    }
  };

  if (onboarding.isLoading) return <div className="mx-auto max-w-xl"><Link className="inline-flex items-center gap-2 text-sm text-atseen-muted" to="/settings"><FiArrowLeft /> Settings</Link><div className="mt-6 h-96 animate-pulse rounded-3xl bg-white/5" /></div>;
  if (onboarding.isError) return <div className="mx-auto max-w-xl"><Link className="inline-flex items-center gap-2 text-sm text-atseen-muted" to="/settings"><FiArrowLeft /> Settings</Link><p className="mt-6 rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load content preferences.</p></div>;

  return <main className="mx-auto w-full max-w-xl pb-16">
    <header className="flex items-center gap-3"><Link aria-label="Back to settings" className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.07]" to="/settings"><FiArrowLeft /></Link><h1 className="text-xl font-black">Content preferences</h1></header>

    <section className="mt-8"><h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-dim">What is @seen for you</h2><p className="mt-2 text-sm leading-5 text-atseen-muted">Pick up to two — they decide what leads your Seen, Discover and Wall.</p><div className="mt-3 grid gap-2">{PURPOSES.map(([key, title, subtitle]) => { const active = purposes.includes(key); return <button className={`rounded-2xl border p-4 text-left transition ${active ? "border-atseen-blue/60 bg-atseen-blue/10" : "border-atseen-line bg-atseen-surface hover:border-atseen-blue/30"}`} key={key} onClick={() => togglePurpose(key)} type="button"><b className={active ? "text-atseen-blue" : "text-white"}>{title}</b><small className="mt-1 block text-[11px] text-atseen-dim">{subtitle}</small></button>; })}</div></section>

    <section className="mt-7"><h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-dim">Languages you watch</h2><div className="mt-3 flex flex-wrap gap-2">{LANGUAGES.map(([key, label]) => <button className={`rounded-full border px-3.5 py-2 text-xs font-bold ${languages.includes(key) ? "border-atseen-blue/60 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-atseen-surface text-atseen-muted"}`} key={key} onClick={() => toggleLanguage(key)} type="button">{label}</button>)}</div></section>

    <section className="mt-7"><label className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-dim" htmlFor="content-city">Your city</label><input className="mt-3 w-full rounded-full border border-atseen-line bg-atseen-surface px-4 py-3 text-sm text-white outline-none focus:border-atseen-blue" id="content-city" onChange={(event) => setCity(event.target.value)} placeholder="City for nearby recommendations" value={city} /></section>

    <section className="mt-7"><h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-dim">Topics</h2><p className="mt-2 text-[10px] text-atseen-dim">Tap: more · tap again: less · once more: neutral</p><div className="mt-3 flex flex-wrap gap-2">{categories.map((item) => { const state = topicStates[item.id] || 0; return <button className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${state === 1 ? "border-atseen-blue/60 bg-atseen-blue/10 text-atseen-blue" : state === -1 ? "border-white/5 bg-transparent text-white/30 line-through" : "border-atseen-line bg-atseen-surface text-atseen-muted"}`} key={item.id} onClick={() => cycleTopic(item.id)} type="button">{state === -1 ? "− " : ""}{item.name}</button>; })}</div><p className="mt-3 text-xs text-atseen-muted">{selectedTopics.length} of 8 topics selected</p></section>

    <section className="mt-8 border-t border-atseen-line pt-6"><h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-dim">How it learns</h2><p className="mt-3 text-sm leading-6 text-atseen-muted">Discover learns only from what you do inside @seen: what you finish, save, repost, and who you follow. “Not interested” weighs the most. Nothing is bought and nothing is boosted.</p></section>

    {message ? <p className="mt-5 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200" role="status">{message}</p> : null}
    {error ? <p className="mt-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-200" role="alert">{error}</p> : null}
    <button className="mt-6 w-full rounded-2xl bg-atseen-blue py-3.5 text-sm font-black text-atseen-bg disabled:opacity-50" disabled={saving} onClick={save} type="button">{saving ? "Saving..." : "Save preferences"}</button>
  </main>;
}
