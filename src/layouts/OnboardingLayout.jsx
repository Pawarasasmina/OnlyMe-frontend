import AtseenLogo from "../components/branding/AtseenLogo";

function OnboardingLayout({ backDisabled = false, children, currentStep = 0, onBack, onSkip, saving = false, steps = [] }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_500px_at_70%_18%,rgba(156,203,255,0.12),transparent_60%),radial-gradient(640px_420px_at_20%_85%,rgba(111,169,232,0.08),transparent_62%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1120px] flex-col px-4 py-[max(16px,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-3">
          <AtseenLogo size={34} />
          <div className="flex items-center gap-2">
            {!backDisabled ? (
              <button className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/5 hover:text-white" onClick={onBack} type="button">
                Back
              </button>
            ) : null}
            {onSkip ? (
              <button className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/55 transition hover:border-[#9CCBFF]/35 hover:text-[#9CCBFF]" disabled={saving} onClick={onSkip} type="button">
                {saving ? "Saving..." : "Skip"}
              </button>
            ) : null}
          </div>
        </header>
        {steps.length ? (
          <div className="mx-auto mt-2 flex w-full max-w-[680px] items-center gap-2" aria-label={`Onboarding step ${currentStep + 1} of ${steps.length}`}>
            {steps.map((step, index) => (
              <span className={`h-1.5 rounded-full transition-all ${index <= currentStep ? "bg-[#9CCBFF]" : "bg-white/10"} ${index === currentStep ? "flex-[1.7]" : "flex-1"}`} key={step} />
            ))}
          </div>
        ) : null}
        <main className="flex flex-1 items-center justify-center py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export default OnboardingLayout;

