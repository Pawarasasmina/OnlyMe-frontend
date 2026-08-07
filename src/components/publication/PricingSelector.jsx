import { PREMIUM_PRESETS } from "../../utils/worldValidation";

export default function PricingSelector({ kind, pricing, onChange, disabled }) {
  if (kind !== "PREMIUM_WORLD") return <div><h2 className="font-black">Free World</h2><p className="mt-2 text-xs leading-5 text-atseen-muted">Both free planets stay completely open. Only a Premium Planet can contain Members Only chapters.</p></div>;

  return <fieldset disabled={disabled}>
    <legend className="font-black">Residency price</legend>
    <p className="mt-1 text-[11px] leading-5 text-atseen-muted">Choose the creator-set Stars price charged for the first paid chapter and automatically every 30 days afterward.</p>
    <div className="premium-price-options mt-4">
      {PREMIUM_PRESETS.map((amount) => {
        const selected = pricing?.starsAmount === amount;
        return <button aria-pressed={selected} className={`premium-price-option ${selected ? "is-selected" : ""}`} key={amount} onClick={() => onChange({ mode: "MONTHLY", starsAmount: amount, presetId: `MONTHLY_${amount}` })} type="button">
          <span className="premium-price-stars">✦{amount}</span><small>Every 30 days</small><span className="premium-price-check" aria-hidden="true">{selected ? "✓" : ""}</span>
        </button>;
      })}
    </div>
    <p className="mt-4 rounded-xl border border-atseen-line bg-atseen-bg/50 p-3 text-[10px] leading-4 text-atseen-muted">Unlocking any paid chapter starts residency immediately. Fans can cancel renewal anytime and keep access until the current period ends.</p>
  </fieldset>;
}
