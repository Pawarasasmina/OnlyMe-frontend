/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { PREMIUM_PRESETS } from "../../utils/worldValidation";

export default function PricingSelector({ kind, pricing, onChange, disabled }) {
  __useUiLanguage();
  if (kind !== "PREMIUM_WORLD") return <div><h2 className="font-black">{__msg("publication.freeWorld")}</h2><p className="mt-2 text-xs leading-5 text-atseen-muted">{__msg("publication.bothFreePlanetsStayCompletelyOpenOnlyAPremium")}</p></div>;

  return <fieldset disabled={disabled}>
    <legend className="font-black">{__msg("publication.residencyPrice")}</legend>
    <p className="mt-1 text-[11px] leading-5 text-atseen-muted">{__msg("publication.chooseTheCreatorSetStarsPriceChargedForThe")}</p>
    <div className="premium-price-options mt-4">
      {PREMIUM_PRESETS.map((amount) => {
        const selected = pricing?.starsAmount === amount;
        return <button aria-pressed={selected} className={`premium-price-option ${selected ? "is-selected" : ""}`} key={amount} onClick={() => onChange({ mode: "MONTHLY", starsAmount: amount, presetId: `MONTHLY_${amount}` })} type="button">
          <span className="premium-price-stars">✦{amount}</span><small>{__msg("publication.every30Days")}</small><span className="premium-price-check" aria-hidden="true">{selected ? "✓" : ""}</span>
        </button>;
      })}
    </div>
    <p className="mt-4 rounded-xl border border-atseen-line bg-atseen-bg/50 p-3 text-[10px] leading-4 text-atseen-muted">{__msg("publication.unlockingAnyPaidChapterStartsResidencyImmediatelyFansCan")}</p>
  </fieldset>;
}
