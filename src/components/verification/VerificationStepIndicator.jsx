import { optionLabel as __optionLabel } from "../../i18n/runtime.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
const steps = __uiTuple(["Personal", { __uiMessage: "verification.identity" }, { __uiMessage: "verification.selfie" }, { __uiMessage: "verification.declaration" }, { __uiMessage: "admin.review" }]);

function VerificationStepIndicator({ currentStep }) {
  __useUiLanguage();
  return <ol aria-label={__msg("verification.verificationProgress")} className="grid grid-cols-5 gap-2">
    {steps.map((step, index) => <li aria-current={index === currentStep ? "step" : undefined} className="min-w-0" key={step}>
      <div className={`h-1.5 rounded-full ${index <= currentStep ? "bg-brand-primary" : "bg-white/10"}`} />
      <span className={`mt-2 hidden truncate text-xs sm:block ${index === currentStep ? "font-bold text-white" : "text-brand-mist/45"}`}>{__optionLabel(step)}</span>
    </li>)}
  </ol>;
}

export default VerificationStepIndicator;
