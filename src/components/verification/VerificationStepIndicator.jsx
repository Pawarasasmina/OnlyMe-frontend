const steps = ["Personal", "Identity", "Selfie", "Declaration", "Review"];

function VerificationStepIndicator({ currentStep }) {
  return <ol aria-label="Verification progress" className="grid grid-cols-5 gap-2">
    {steps.map((step, index) => <li aria-current={index === currentStep ? "step" : undefined} className="min-w-0" key={step}>
      <div className={`h-1.5 rounded-full ${index <= currentStep ? "bg-brand-primary" : "bg-white/10"}`} />
      <span className={`mt-2 hidden truncate text-xs sm:block ${index === currentStep ? "font-bold text-white" : "text-brand-mist/45"}`}>{step}</span>
    </li>)}
  </ol>;
}

export default VerificationStepIndicator;
