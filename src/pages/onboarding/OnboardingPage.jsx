import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiChevronRight, FiGlobe, FiLoader, FiMapPin, FiPhone, FiUsers } from "react-icons/fi";
import OnboardingLayout from "../../layouts/OnboardingLayout";
import AccountTypePicker from "../../components/onboarding/AccountTypePicker";
import OnboardingTicket from "../../components/onboarding/OnboardingTicket";
import PrototypeInterestPicker from "../../components/onboarding/PrototypeInterestPicker";
import { useAuth } from "../../hooks/useAuth";
import { useOnboarding, useOnboardingSuggestions } from "../../hooks/useOnboarding";
import { defaultDestinationFor, isOnboardingComplete } from "../../utils/socialAccess";
import { normalizeApiError } from "../../utils/apiErrors";

const steps = ["welcome", "interests", "account-type", "fill-feed", "ticket"];
const routes = [...steps, "complete"];
const normalizedStage = (value) => value === "completed" ? "complete" : routes.includes(value) ? value : null;
const pathFor = (value) => `/onboarding/${value}`;
const accountCategories = {
  creator: ["Digital creator", "Coach", "Traveler", "Artist", "Musician", "Athlete", "Chef", "Educator"],
  business: ["Shop", "Café & restaurant", "Studio & salon", "Fitness club", "Hotel & travel", "Media & news", "Services", "Brand"],
};
const contactChoices = [{ id: "call", label: "Call", icon: FiPhone }, { id: "directions", label: "Directions", icon: FiMapPin }, { id: "website", label: "Website", icon: FiGlobe }];

function Loading({ label = "Preparing your @seen…" }) {
  return <div className="grid min-h-[420px] place-items-center text-center"><div><FiLoader className="mx-auto animate-spin text-3xl text-[#9CCBFF]" /><p className="mt-4 text-sm font-bold text-white/55">{label}</p></div></div>;
}
function Panel({ children, eyebrow, subtitle, title }) {
  return <section className="w-full max-w-[620px] rounded-[26px] border border-white/10 bg-[#0A0C0F]/95 p-5 shadow-2xl sm:p-7"><p className="text-[11px] font-black uppercase tracking-[.22em] text-[#9CCBFF]">{eyebrow}</p><h1 className="mt-2 text-[28px] font-black leading-tight tracking-[-.03em]">{title}</h1><p className="mt-2 text-sm leading-6 text-white/55">{subtitle}</p>{children}</section>;
}
function Cta({ busy, children, disabled, error, onClick, note }) {
  return <div className="sticky bottom-0 -mx-5 mt-6 border-t border-white/10 bg-[#0A0C0F]/95 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-7 sm:px-7">{error ? <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}<button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#9CCBFF] py-4 font-black text-[#0A0C0F] transition active:scale-[.97] disabled:opacity-40" disabled={disabled || busy} onClick={onClick} type="button">{busy ? "Saving…" : children}<FiChevronRight /></button>{note ? <p className="mt-3 text-center text-xs text-white/35">{note}</p> : null}</div>;
}

export default function OnboardingPage() {
  const { step } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();
  const onboarding = useOnboarding();
  const state = onboarding.data;
  const requested = normalizedStage(step);
  const [stage, setStage] = useState(requested || "welcome");
  const [interests, setInterests] = useState([]);
  const [profileType, setProfileType] = useState("personal");
  const [accountSetup, setAccountSetup] = useState("type");
  const [accountCategory, setAccountCategory] = useState("");
  const [contactButtons, setContactButtons] = useState(["call", "directions"]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [error, setError] = useState("");
  const suggestions = useOnboardingSuggestions(stage === "fill-feed");
  const home = defaultDestinationFor(user?.role);

  useEffect(() => {
    if (!state) return;
    const saved = normalizedStage(state.onboarding?.currentStep) || "welcome";
    const allowed = requested && routes.indexOf(requested) <= routes.indexOf(saved);
    const next = allowed ? requested : saved;
    setStage(next);
    setInterests(state.profile?.interests || []);
    setProfileType(state.user?.profileType || "personal");
    if (step !== next) navigate(pathFor(next), { replace: true });
  }, [navigate, requested, state, step]);
  useEffect(() => { setError(""); window.scrollTo({ top: 0, behavior: "instant" }); }, [stage]);

  const go = (next) => { setStage(next); navigate(pathFor(next)); };
  const fail = (reason, fallback) => setError(normalizeApiError(reason, fallback).message);
  const run = async (action, next, fallback) => { setError(""); try { await action(); go(next); } catch (reason) { fail(reason, fallback); } };
  if (authLoading) return <OnboardingLayout><Loading label="Checking your account…" /></OnboardingLayout>;
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />;
  if (user.role === "admin") return <Navigate replace to="/admin/dashboard" />;
  if (isOnboardingComplete(user)) return <Navigate replace to={home} />;
  if (onboarding.isLoading || !state) return <OnboardingLayout><Loading /></OnboardingLayout>;
  if (onboarding.isError) return <OnboardingLayout><Panel eyebrow="Connection" title="Couldn’t open onboarding" subtitle={normalizeApiError(onboarding.error, "Please try again.").message}><button className="mt-6 w-full rounded-2xl bg-[#9CCBFF] py-4 font-black text-black" onClick={() => onboarding.refetch()} type="button">Retry</button></Panel></OnboardingLayout>;
  if (stage === "welcome") return <Navigate replace to="/welcome" />;

  const toggleInterest = (id) => setInterests((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const togglePerson = (id) => setSelectedPeople((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const list = suggestions.data || [];
  const saveInterests = () => run(() => onboarding.saveInterests.mutateAsync(interests), "account-type", "Couldn’t save your interests.");
  const saveType = (selection = { profileType, category: accountCategory, contactButtons }) => run(() => onboarding.saveProfileType.mutateAsync(selection), "fill-feed", "Couldn’t save your account type.");
  const savePeople = async (people = selectedPeople) => {
    setError("");
    try {
      const response = await onboarding.savePeople.mutateAsync(people);
      const next = response?.data?.data?.onboarding?.currentStep;
      if (next === "ticket") {
        navigate(home, { replace: true });
        return;
      }
      await onboarding.complete.mutateAsync();
      navigate(home, { replace: true });
    } catch (reason) {
      fail(reason, "Couldn’t save who you followed.");
    }
  };
  const ticketContinue = async () => {
    setError("");
    try {
      await onboarding.acknowledgeTicket.mutateAsync();
      await onboarding.complete.mutateAsync();
      navigate(home, { replace: true });
    } catch (reason) {
      fail(reason, "Couldn’t open your feed.");
    }
  };
  const finish = async () => { try { await onboarding.complete.mutateAsync(); navigate(home, { replace: true }); } catch (reason) { fail(reason, "Couldn’t open your feed."); } };

  if (stage === "interests") return <PrototypeInterestPicker busy={onboarding.saveInterests.isPending} categories={state.categories} error={error} onBack={() => go("welcome")} onContinue={saveInterests} onToggle={toggleInterest} selected={interests} />;

  if (stage === "account-type") {
    const shell = (content) => <main className="min-h-[100dvh] w-full bg-[#0A0C0F] text-white"><section className="mx-auto min-h-[100dvh] w-full max-w-[445px] border-x border-white/[.07] px-[25px] pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(58px,env(safe-area-inset-top))]">{content}</section></main>;
    if (accountSetup === "category") return shell(<><h1 className="text-[27px] font-black tracking-[-.035em]">Choose a category</h1><p className="mt-2 text-[14px] text-white/60">Shown under your name. You can change it anytime.</p><div className="mt-5 flex flex-wrap gap-2">{accountCategories[profileType].map((category) => <button className={`rounded-full px-4 py-2.5 text-[13px] font-bold active:scale-[.97] ${accountCategory === category ? "bg-white text-[#0A0C0F]" : "bg-white/[.06] text-white/65"}`} key={category} onClick={() => setAccountCategory(category)} type="button">{category}</button>)}</div><button className="mt-7 w-full rounded-[14px] bg-[#9CCBFF] py-[15px] font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-40" disabled={!accountCategory} onClick={() => profileType === "business" ? setAccountSetup("contacts") : saveType()} type="button">{profileType === "business" ? "Next" : "Continue"}</button><button className="mt-3 w-full py-2 text-[13px] text-white/55" onClick={() => setAccountSetup("type")} type="button">Back</button></>);
    if (accountSetup === "contacts") return shell(<><h1 className="text-[27px] font-black tracking-[-.035em]">Contact buttons</h1><p className="mt-2 text-[14px] leading-6 text-white/60">Shown under your name. People reach you in one tap.</p><div className="mt-5 divide-y divide-white/[.06]">{contactChoices.map(({ id, label, icon: Icon }) => { const enabled = contactButtons.includes(id); return <button className="flex w-full items-center gap-4 py-4 text-left active:scale-[.97]" key={id} onClick={() => setContactButtons((current) => enabled ? current.filter((item) => item !== id) : [...current, id])} type="button"><Icon className="text-lg text-white/60" /><b className="flex-1 text-sm">{label}</b><span className={`relative h-7 w-12 rounded-full ${enabled ? "bg-[#9CCBFF]" : "bg-white/10"}`}><i className={`absolute top-1 h-5 w-5 rounded-full bg-[#0A0C0F] transition ${enabled ? "left-6" : "left-1"}`} /></span></button>; })}</div><button className="mt-6 w-full rounded-[14px] bg-[#9CCBFF] py-[15px] font-black text-[#0A0C0F] active:scale-[.97]" onClick={() => saveType()} type="button">Continue</button><button className="mt-3 w-full py-2 text-[13px] text-white/55" onClick={() => setAccountSetup("category")} type="button">Back</button></>);
    return shell(<><h1 className="text-[27px] font-black leading-[1.08] tracking-[-.035em]">How will you use @seen?</h1><p className="mt-2 text-[14px] leading-[1.65] text-white/60">Everyone can share and earn. This only sets which tools you see — change it anytime in Settings.</p><div className="mt-[14px]"><AccountTypePicker onChange={(value) => { setProfileType(value); setAccountCategory(""); }} value={profileType} /></div>{error ? <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-200">{error}</p> : null}<button className="mt-4 w-full rounded-[14px] bg-[#9CCBFF] py-[15px] text-[15px] font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-45" disabled={onboarding.saveProfileType.isPending} onClick={() => profileType === "personal" ? saveType({ profileType: "personal", category: "", contactButtons: [] }) : setAccountSetup("category")} type="button">{onboarding.saveProfileType.isPending ? "Saving..." : "Continue"}</button><button className="mt-3 w-full py-2 text-[13px] text-white/55 active:scale-[.97]" disabled={onboarding.saveProfileType.isPending} onClick={() => saveType({ profileType: "personal", category: "", contactButtons: [] })} type="button">Not now</button></>);
  }

  if (stage === "fill-feed") {
    const followed = selectedPeople.length;
    const left = Math.max(0, 5 - followed);
    return <main className="min-h-[100dvh] w-full bg-[#0A0C0F] text-white"><section className="relative mx-auto min-h-[100dvh] w-full max-w-[445px] border-x border-white/[.07]"><div className="px-[34px] pb-40 pt-[max(62px,env(safe-area-inset-top))]"><h1 className="text-[28px] font-black tracking-[-.035em]">Fill your feed</h1><p className="mt-1.5 text-[14px] text-white/60">Follow 5 people to start. Change it anytime.</p><button className="mt-5 flex w-full items-center gap-3 rounded-[18px] border border-white/10 bg-white/[.05] p-[14px] text-left active:scale-[.97]" type="button"><span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[#9CCBFF]/15 text-[#D6EAFF]"><FiUsers /></span><span className="min-w-0 flex-1"><b className="block text-[14px]">Friends from your contacts</b><small className="mt-0.5 block truncate text-[12px] text-white/40">See who’s already here · nothing is posted</small></span><span className="rounded-full bg-white/10 px-3 py-2 text-[12px] font-bold">Find</span></button><p className="mb-1 mt-6 text-[11px] font-black tracking-[.14em] text-white/35">FOR YOU · {String(state.profile?.city || "DUBAI").toUpperCase()}</p>{suggestions.isLoading ? <Loading label="Finding people for you..." /> : list.map((person) => { const active = selectedPeople.includes(person.id); const place = typeof person.location === "string" ? person.location : [person.location?.city, person.location?.country].filter(Boolean).join(", "); const role = person.categories?.[0] || person.bio || person.reason || "Recommended for you"; return <div className="flex items-center gap-3 py-[9px]" key={person.id}><img alt="" className="h-[46px] w-[46px] shrink-0 rounded-full bg-white/10 object-cover" src={person.avatar || "/default-avatar.png"} /><span className="min-w-0 flex-1"><b className="block truncate text-[14.5px]">{person.name?.split(" ")[0] || person.username}</b><small className="block truncate text-[12px] text-white/40">{role}{place ? ` · ${place.split(",")[0]}` : ""}</small></span><button className={`min-w-[84px] rounded-full px-4 py-2 text-[12.5px] font-black active:scale-[.97] ${active ? "bg-white/[.08] text-white" : "bg-[#9CCBFF] text-[#0A0C0F]"}`} onClick={() => togglePerson(person.id)} type="button">{active ? "Following" : "Follow"}</button></div>; })}</div><div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[443px] bg-gradient-to-b from-transparent via-[#0A0C0F] to-[#0A0C0F] px-[34px] pb-[max(32px,env(safe-area-inset-bottom))] pt-8"><div className="mb-3 flex gap-1">{Array.from({ length: 5 }, (_, index) => <i className={`h-[3px] flex-1 rounded-full ${index < followed ? "bg-[#9CCBFF]" : "bg-white/15"}`} key={index} />)}</div><button className={`w-full rounded-[16px] py-[15px] text-[15px] font-black ${left ? "cursor-default bg-white/[.08] text-white/55" : "bg-[#9CCBFF] text-[#0A0C0F] active:scale-[.97]"}`} disabled={Boolean(left) || onboarding.savePeople.isPending} onClick={() => savePeople()} type="button">{left ? `${left} more to go` : "Continue"}</button><button className="w-full pt-3 text-[12.5px] text-white/40 active:scale-[.97]" disabled={onboarding.savePeople.isPending} onClick={() => savePeople()} type="button">Not now</button></div></section></main>;
  }

  if (stage === "ticket") return <OnboardingTicket busy={onboarding.acknowledgeTicket.isPending || onboarding.complete.isPending} city={state.profile?.city || "Dubai"} memberNumber={state.user?.memberNumber || user.memberNumber} name={user.name} onContinue={ticketContinue} />;

  return <OnboardingLayout backDisabled={stage === "welcome"} currentStep={Math.max(0, steps.indexOf(stage))} onBack={() => go(routes[Math.max(0, routes.indexOf(stage) - 1)])} steps={steps}>
    {stage === "complete" ? <Panel eyebrow="FOR YOU" title="Your feed is ready" subtitle="@seen has ranked your first feed using the topics and people you chose."><div className="mt-6 flex flex-wrap gap-2">{interests.map((item) => <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#0A0C0F]" key={item}>{item}</span>)}</div><Cta busy={onboarding.complete.isPending} error={error} onClick={finish}>Enter @seen</Cta></Panel> : null}
  </OnboardingLayout>;
}
