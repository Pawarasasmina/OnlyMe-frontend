import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiChevronRight, FiLoader } from "react-icons/fi";
import OnboardingLayout from "../../layouts/OnboardingLayout";
import WelcomeCarousel from "../../components/onboarding/WelcomeCarousel";
import InterestGrid from "../../components/onboarding/InterestGrid";
import InstinctTuning from "../../components/onboarding/InstinctTuning";
import SuggestedPeopleGrid from "../../components/onboarding/SuggestedPeopleGrid";
import AtseenEyeMark from "../../components/onboarding/AtseenEyeMark";
import LightYourWorldChecklist from "../../components/onboarding/LightYourWorldChecklist";
import { useAuth } from "../../hooks/useAuth";
import { useOnboarding, useOnboardingSuggestions } from "../../hooks/useOnboarding";
import { defaultDestinationFor, isOnboardingComplete } from "../../utils/socialAccess";
import { normalizeApiError } from "../../utils/apiErrors";

const progressSteps = ["welcome", "interests", "instincts", "people", "light-your-world"];
const routeSteps = [...progressSteps, "complete"];
const emptyPreferences = {
  showMe: "everyone",
  creatorVibe: "any",
  contentDepth: "both",
  discoveryRange: "global",
  creatorStyle: "any",
};

function normalizeRouteStep(step) {
  if (!step) return null;
  if (step === "checklist") return "light-your-world";
  if (step === "completed") return "complete";
  return routeSteps.includes(step) ? step : null;
}

function stepPath(step) {
  return `/onboarding/${step === "completed" ? "complete" : step}`;
}

function savedStep(state) {
  const step = state?.onboarding?.currentStep || "welcome";
  return normalizeRouteStep(step) || "welcome";
}

function progressIndexFor(stage) {
  if (stage === "complete") return progressSteps.length - 1;
  return Math.max(0, progressSteps.indexOf(stage));
}

function LoadingState({ label = "Loading onboarding..." }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <FiLoader className="mb-4 animate-spin text-3xl text-[#9CCBFF]" />
      <p className="text-sm font-bold text-white/62">{label}</p>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  const normalized = normalizeApiError(error, "Unable to load onboarding.");
  return (
    <div className="w-full max-w-[560px] rounded-3xl border border-[#F17878]/30 bg-[#F17878]/10 p-6 text-center">
      <h1 className="text-2xl font-black text-white">Something did not load</h1>
      <p className="mt-3 text-sm leading-6 text-[#F17878]">{normalized.message}</p>
      <button className="mt-5 rounded-2xl bg-[#9CCBFF] px-5 py-3 font-black text-[#0A0C0F]" onClick={onRetry} type="button">Retry</button>
    </div>
  );
}

function StagePanel({ children, eyebrow, title, subtitle }) {
  return (
    <section className="onboarding-stage-panel w-full max-w-[900px] rounded-[24px] border border-white/10 bg-[#0A0C0F]/92 p-5 shadow-glow sm:p-6 lg:p-7">
      <div className="mb-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#9CCBFF]/80">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black tracking-normal text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-[660px] text-sm leading-6 text-white/62">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function BottomCta({ children, disabled, error, onClick, secondary }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 border-t border-white/10 bg-[#0A0C0F]/95 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-7 sm:px-7 lg:-mx-8 lg:px-8">
      {error ? <p className="mb-3 rounded-2xl border border-[#F17878]/30 bg-[#F17878]/10 p-3 text-sm text-[#F17878]" role="alert">{error}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {secondary ? <div className="text-sm text-white/45">{secondary}</div> : <span />}
        <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#9CCBFF] px-5 py-4 font-black text-[#0A0C0F] transition hover:bg-[#6FA9E8] disabled:opacity-45" disabled={disabled} onClick={onClick} type="button">
          {children} <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function OnboardingPage() {
  const { step } = useParams();
  const { loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = useOnboarding();
  const state = onboarding.data;
  const routeStage = normalizeRouteStep(step);
  const [stage, setStage] = useState(routeStage || "welcome");
  const [interests, setInterests] = useState([]);
  const [preferences, setPreferences] = useState(emptyPreferences);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [error, setError] = useState("");
  const suggestions = useOnboardingSuggestions(stage === "people");

  const roleHome = defaultDestinationFor(user?.role);
  const saving = onboarding.saveWelcome.isPending
    || onboarding.saveInterests.isPending
    || onboarding.saveInstincts.isPending
    || onboarding.savePeople.isPending
    || onboarding.acknowledgeChecklist.isPending
    || onboarding.complete.isPending;

  useEffect(() => {
    if (!state) return;
    const authoritativeStage = savedStep(state);
    const requestedIsAllowed = routeStage
      && routeSteps.indexOf(routeStage) <= routeSteps.indexOf(authoritativeStage);
    const nextStage = requestedIsAllowed ? routeStage : authoritativeStage;
    setStage(nextStage);
    setInterests(state.profile?.interests || []);
    setPreferences({ ...emptyPreferences, ...(state.profile?.discoveryPreferences || {}) });
    if (!routeStage || step !== nextStage) {
      navigate(stepPath(nextStage), { replace: true });
    }
  }, [navigate, routeStage, state, step]);

  useEffect(() => {
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage]);

  const navigateStage = (nextStage) => {
    setStage(nextStage);
    navigate(stepPath(nextStage));
  };

  if (authLoading) return <OnboardingLayout backDisabled steps={progressSteps}><LoadingState label="Checking session..." /></OnboardingLayout>;
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />;
  if (user.role === "admin") return <Navigate replace to="/admin/dashboard" />;
  if (isOnboardingComplete(user)) return <Navigate replace to={roleHome} />;

  if (onboarding.isLoading || !state) {
    return <OnboardingLayout backDisabled steps={progressSteps}><LoadingState /></OnboardingLayout>;
  }

  if (onboarding.isError) {
    return <OnboardingLayout backDisabled steps={progressSteps}><ErrorState error={onboarding.error} onRetry={() => onboarding.refetch()} /></OnboardingLayout>;
  }

  const fail = (requestError, fallback) => {
    const normalized = normalizeApiError(requestError, fallback);
    setError(normalized.message);
  };

  const goBack = () => {
    const currentIndex = routeSteps.indexOf(stage);
    navigateStage(routeSteps[Math.max(0, currentIndex - 1)]);
  };

  const saveWelcome = async () => {
    try {
      await onboarding.saveWelcome.mutateAsync();
      navigateStage("interests");
    } catch (requestError) {
      fail(requestError, "Unable to save your welcome step.");
    }
  };

  const saveInterests = async () => {
    try {
      await onboarding.saveInterests.mutateAsync(interests);
      navigateStage("instincts");
    } catch (requestError) {
      fail(requestError, "Unable to save your interests.");
    }
  };

  const saveInstincts = async () => {
    try {
      await onboarding.saveInstincts.mutateAsync(preferences);
      navigateStage("people");
    } catch (requestError) {
      fail(requestError, "Unable to save your instincts.");
    }
  };

  const savePeople = async () => {
    try {
      await onboarding.savePeople.mutateAsync(selectedPeople);
      navigateStage("light-your-world");
    } catch (requestError) {
      fail(requestError, "Unable to save your Orbit selections.");
    }
  };

  const acknowledgeChecklist = async () => {
    try {
      await onboarding.acknowledgeChecklist.mutateAsync();
      navigateStage("complete");
    } catch (requestError) {
      fail(requestError, "Unable to save your checklist review.");
    }
  };

  const complete = async () => {
    try {
      await onboarding.complete.mutateAsync();
      navigate(roleHome, { replace: true });
    } catch (requestError) {
      fail(requestError, "Unable to complete onboarding.");
    }
  };

  const toggleInterest = (id) => {
    setInterests((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 8 ? [...current, id] : current);
  };

  const togglePerson = (id) => {
    setSelectedPeople((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 10 ? [...current, id] : current);
  };

  const suggestionList = suggestions.data || [];
  const currentStep = progressIndexFor(stage);

  return (
    <OnboardingLayout
      backDisabled={stage === "welcome"}
      currentStep={currentStep}
      onBack={goBack}
      saving={saving}
      steps={progressSteps}
    >
      {stage === "welcome" ? (
        <WelcomeCarousel
          error={error}
          onAlreadyHaveAccount={() => navigate(roleHome, { replace: true })}
          onGetStarted={saveWelcome}
          saving={onboarding.saveWelcome.isPending}
        />
      ) : null}

      {stage === "interests" ? (
        <StagePanel eyebrow="Step 2 of 5" subtitle="Choose what you want to see more of." title="Build your world">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-white/62" aria-live="polite">{interests.length} of 8 selected</p>
            {interests.length < 3 ? <p className="text-sm font-bold text-[#9CCBFF]">Choose at least 3</p> : null}
          </div>
          {state.categories?.length ? (
            <InterestGrid categories={state.categories} onToggle={toggleInterest} selected={interests} />
          ) : (
            <ErrorState error={{ message: "Categories are unavailable right now." }} onRetry={() => onboarding.refetch()} />
          )}
          <BottomCta disabled={interests.length < 3 || saving || !state.categories?.length} error={error} onClick={saveInterests} secondary="You can change interests later in Settings.">
            {onboarding.saveInterests.isPending ? "Saving..." : "Continue"}
          </BottomCta>
        </StagePanel>
      ) : null}

      {stage === "instincts" ? (
        <StagePanel eyebrow="Step 3 of 5" subtitle="Choose the kind of people and experiences you naturally notice." title="Tune your instincts">
          <InstinctTuning onChange={(key, value) => setPreferences((current) => ({ ...current, [key]: value }))} values={preferences} />
          <BottomCta disabled={saving} error={error} onClick={saveInstincts} secondary="Discovery defaults to Everyone unless you choose otherwise.">
            {onboarding.saveInstincts.isPending ? "Saving..." : "Continue"}
          </BottomCta>
        </StagePanel>
      ) : null}

      {stage === "people" ? (
        <StagePanel eyebrow="Step 4 of 5" subtitle="Start your Orbit with a few people who match your interests." title="People worth seeing">
          {suggestions.isLoading ? <LoadingState label="Finding people worth seeing..." /> : null}
          {suggestions.isError ? <ErrorState error={suggestions.error} onRetry={() => suggestions.refetch()} /> : null}
          {!suggestions.isLoading && !suggestions.isError && !suggestionList.length ? (
            <div className="rounded-[22px] border border-white/10 bg-[#12151B] p-6 text-center">
              <h2 className="text-2xl font-black">Your first people are still being discovered.</h2>
              <p className="mt-2 text-sm leading-6 text-white/62">You can retry or continue without following.</p>
              <button className="mt-5 rounded-2xl border border-white/10 px-5 py-3 font-bold text-white/70 hover:bg-white/5" onClick={() => suggestions.refetch()} type="button">Retry</button>
            </div>
          ) : null}
          {suggestionList.length ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-white/62" aria-live="polite">{selectedPeople.length} of 10 selected</p>
                {selectedPeople.length < 3 ? <p className="text-sm font-bold text-[#9CCBFF]">Try choosing 3, or skip for now.</p> : null}
              </div>
              <SuggestedPeopleGrid onToggle={togglePerson} people={suggestionList} selected={selectedPeople} />
            </>
          ) : null}
          <BottomCta disabled={saving || suggestions.isLoading} error={error} onClick={savePeople} secondary={suggestionList.length ? "Selected people are saved together when you continue." : "You can continue without following."}>
            {onboarding.savePeople.isPending ? "Saving..." : selectedPeople.length ? "Follow selected" : "Skip for now"}
          </BottomCta>
        </StagePanel>
      ) : null}

      {stage === "light-your-world" ? (
        <StagePanel eyebrow="Step 5 of 5" subtitle="A few small steps make your Atseen experience feel alive." title="Light your world">
          <LightYourWorldChecklist forceVisible onboardingMode />
          <BottomCta disabled={saving} error={error} onClick={acknowledgeChecklist} secondary="Only interests and instincts are required. The rest can wait.">
            {onboarding.acknowledgeChecklist.isPending ? "Saving..." : "Continue"}
          </BottomCta>
        </StagePanel>
      ) : null}

      {stage === "complete" ? (
        <StagePanel eyebrow="Ready" subtitle="Your feed, Orbit and Worlds are now tuned to you." title="Your world is lit.">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(156,203,255,.16),transparent_55%),#12151B] p-8 text-center">
              <AtseenEyeMark className="h-32 w-52" />
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {interests.slice(0, 8).map((interest) => <span className="rounded-full border border-[#9CCBFF]/25 bg-[#9CCBFF]/10 px-3 py-1 text-xs font-bold text-[#9CCBFF]" key={interest}>{interest}</span>)}
              </div>
              <button className="mt-6 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/62 hover:bg-white/5 hover:text-white" onClick={() => navigateStage("interests")} type="button">Review my choices</button>
            </div>
            <LightYourWorldChecklist compact forceVisible />
          </div>
          <BottomCta disabled={saving} error={error} onClick={complete} secondary={user.role === "creator" ? "Creator monetization stays in Studio." : "Your Home and Orbit are ready."}>
            {onboarding.complete.isPending ? "Lighting..." : "Enter Atseen"}
          </BottomCta>
        </StagePanel>
      ) : null}
    </OnboardingLayout>
  );
}

export default OnboardingPage;
