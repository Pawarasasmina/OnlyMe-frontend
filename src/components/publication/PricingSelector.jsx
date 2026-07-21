import { PREMIUM_PRESETS } from "../../utils/worldValidation";

export default function PricingSelector({ kind, pricing, onChange, disabled }) {
  if (kind === "PREMIUM_WORLD")
    return (
      <fieldset disabled={disabled}>
        <legend className="font-black">Monthly price</legend>
        <p className="mt-1 text-[11px] leading-5 text-atseen-muted">
          Choose the Stars charged automatically every 30 days.
        </p>
        <div className="premium-price-options mt-4">
          {PREMIUM_PRESETS.map((amount) => {
            const selected = pricing?.starsAmount === amount;
            return (
              <button
                aria-pressed={selected}
                className={`premium-price-option ${selected ? "is-selected" : ""}`}
                key={amount}
                onClick={() =>
                  onChange({
                    mode: "MONTHLY",
                    starsAmount: amount,
                    presetId: `MONTHLY_${amount}`,
                  })
                }
                type="button"
              >
                <span className="premium-price-stars">✦{amount}</span>
                <small>Every 30 days</small>
                <span className="premium-price-check" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 rounded-xl border border-atseen-line bg-atseen-bg/50 p-3 text-[10px] leading-4 text-atseen-muted">
          Fans can cancel anytime. Their access remains active until the paid
          30-day period ends.
        </p>
      </fieldset>
    );

  return (
    <label className="block font-black">
      One-time Stars price
      <input
        className="mt-2 w-full rounded-xl border border-atseen-line bg-atseen-bg p-3"
        disabled={disabled}
        min="1"
        onChange={(event) =>
          onChange({
            mode: "ONE_TIME",
            starsAmount: Number(event.target.value),
            presetId: null,
          })
        }
        step="1"
        type="number"
        value={pricing?.starsAmount || 1}
      />
      <span className="mt-2 block text-xs font-normal text-atseen-muted">
        Unlock once — yours forever.
      </span>
    </label>
  );
}
