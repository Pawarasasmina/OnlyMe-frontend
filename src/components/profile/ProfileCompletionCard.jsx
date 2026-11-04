/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function ProfileCompletionCard({ completion }) {
  __useUiLanguage();
  const percentage = completion?.percentage ?? 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{__msg("fan.profileCompletion")}</h2>
          <p className="mt-1 text-sm text-brand-mist/65">
            {completion?.completed ?? 0} {__msg("onboarding.of")} {completion?.total ?? 0}{__msg("profile.recommendedItemsComplete")}</p>
        </div>
        <span className="text-2xl font-black text-brand-secondary">{percentage}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default ProfileCompletionCard;
