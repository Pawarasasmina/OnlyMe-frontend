import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiChevronRight, FiLoader, FiSearch, FiUsers } from "react-icons/fi";
import OnboardingLayout from "../../layouts/OnboardingLayout";
import InterestGrid from "../../components/onboarding/InterestGrid";
import SuggestedPeopleGrid from "../../components/onboarding/SuggestedPeopleGrid";
import AccountTypePicker from "../../components/onboarding/AccountTypePicker";
import OnboardingTicket from "../../components/onboarding/OnboardingTicket";
import { useAuth } from "../../hooks/useAuth";
import { useOnboarding, useOnboardingSuggestions } from "../../hooks/useOnboarding";
import { defaultDestinationFor, isOnboardingComplete } from "../../utils/socialAccess";
import { normalizeApiError } from "../../utils/apiErrors";

const steps = ["welcome", "interests", "account-type", "fill-feed", "ticket"];
const routes = [...steps, "complete"];
const normalizedStage = (value) => value === "completed" ? "complete" : routes.includes(value) ? value : null;
const pathFor = (value) => `/onboarding/${value}`;

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
  const saveType = () => run(() => onboarding.saveProfileType.mutateAsync(profileType), "fill-feed", "Couldn’t save your account type.");
  const savePeople = () => run(() => onboarding.savePeople.mutateAsync(selectedPeople), "ticket", "Couldn’t save who you followed.");
  const ticketContinue = () => run(() => onboarding.acknowledgeTicket.mutateAsync(), "complete", "Couldn’t continue from your ticket.");
  const finish = async () => { try { await onboarding.complete.mutateAsync(); navigate(home, { replace: true }); } catch (reason) { fail(reason, "Couldn’t open your feed."); } };

  return <OnboardingLayout backDisabled={stage === "welcome"} currentStep={Math.max(0, steps.indexOf(stage))} onBack={() => go(routes[Math.max(0, routes.indexOf(stage) - 1)])} steps={steps}>
    {stage === "interests" ? <Panel eyebrow="Step 2 of 5" title="What pulls you in?" subtitle="Every tap is a signal. Choose at least three topics; swipe through the stories that feel like you."><div className="mt-5 flex items-center justify-between"><b className="text-sm">{interests.length} selected</b><span className="text-xs font-bold text-[#9CCBFF]">Minimum 3</span></div><div className="mt-4 max-h-[52dvh] overflow-y-auto pr-1"><InterestGrid categories={state.categories} max={18} onToggle={toggleInterest} selected={interests} /></div><Cta busy={onboarding.saveInterests.isPending} disabled={interests.length < 3} error={error} note="You can change this later in Settings." onClick={saveInterests}>Continue</Cta></Panel> : null}
    {stage === "account-type" ? <Panel eyebrow="Step 3 of 5" title="How will you use @seen?" subtitle="Everyone can earn. Your account type only changes the tools you see, and you can switch later in Settings."><div className="mt-5"><AccountTypePicker onChange={setProfileType} value={profileType} /></div><Cta busy={onboarding.saveProfileType.isPending} error={error} onClick={saveType}>Continue</Cta></Panel> : null}
    {stage === "fill-feed" ? <Panel eyebrow="Step 4 of 5" title="Fill your feed" subtitle="Follow 5 people to start. Your interests choose who appears here."><button className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.05] p-4 text-left active:scale-[.97]" type="button"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#9CCBFF]/15 text-[#BFE3FF]"><FiUsers /></span><span className="flex-1"><b className="block text-sm">Friends from your contacts</b><small className="text-white/45">See who’s here · nothing is posted</small></span><FiSearch /></button><div className="mt-5 flex gap-1">{Array.from({ length: 5 }, (_, index) => <i className={`h-1 flex-1 rounded ${index < selectedPeople.length ? "bg-[#9CCBFF]" : "bg-white/15"}`} key={index} />)}</div><div className="mt-5 max-h-[48dvh] overflow-y-auto">{suggestions.isLoading ? <Loading label="Finding people for you…" /> : <SuggestedPeopleGrid onToggle={togglePerson} people={list} selected={selectedPeople} />}</div><Cta busy={onboarding.savePeople.isPending} disabled={suggestions.isLoading} error={error} note={selectedPeople.length < 5 ? `${5 - selectedPeople.length} more to reach 5 · you can also continue now` : "Your feed is ready."} onClick={savePeople}>{selectedPeople.length >= 5 ? "Continue" : "Not now"}</Cta></Panel> : null}
    {stage === "ticket" ? <OnboardingTicket memberNumber={state.user?.memberNumber || user.memberNumber} name={user.name} onContinue={ticketContinue} /> : null}
    {stage === "complete" ? <Panel eyebrow="FOR YOU" title="Your feed is ready" subtitle="@seen has ranked your first feed using the topics and people you chose."><div className="mt-6 flex flex-wrap gap-2">{interests.map((item) => <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#0A0C0F]" key={item}>{item}</span>)}</div><Cta busy={onboarding.complete.isPending} error={error} onClick={finish}>Enter @seen</Cta></Panel> : null}
  </OnboardingLayout>;
}
