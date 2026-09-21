import { FiArrowLeft, FiClock, FiMessageCircle, FiPhone, FiZap } from "react-icons/fi";

const MESSAGE_PRICES = [50, 100, 200, 500];
const CALL_PRICES = [100, 300, 500, 800, 1500];
const CALL_LENGTHS = [2, 5, 10, 15, 20, 30];

function Choice({ active, children, disabled, onClick }) {
  return <button aria-pressed={active} className={active ? "is-active" : ""} disabled={disabled} onClick={onClick} type="button">{children}</button>;
}

function Toggle({ checked, disabled, label, onChange }) {
  return <button aria-checked={checked} aria-label={label} className={checked ? "is-on direct-settings-toggle" : "direct-settings-toggle"} disabled={disabled} onClick={() => onChange(!checked)} role="switch" type="button"><span /></button>;
}

export default function DirectAccessSettingsSheet({ busy, error, onClose, onSave, settings, setSettings }) {
  const messagePrice = Number(settings.priceStars) || 100;
  const callPrice = Number(settings.callPriceStars) || 500;
  const estimatedUsd = ((messagePrice / 10) * 0.68 * 12) + ((callPrice / 10) * 0.68 * 4);
  const update = (values) => setSettings((current) => ({ ...current, ...values }));

  return <div className="direct-settings-layer" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section aria-labelledby="direct-access-setup-title" aria-modal="true" className="direct-settings-sheet" role="dialog">
      <header className="direct-settings-header"><button aria-label="Close Direct Access settings" disabled={busy} onClick={onClose} type="button"><FiArrowLeft /></button><h2 id="direct-access-setup-title">Direct Access</h2></header>
      <div className="direct-settings-intro"><span><FiZap /></span><h3>Your time, on your terms</h3><p>A private window and a live voice — for<br />those who really need it.</p></div>
      <div className="direct-settings-explainer">
        <p><FiMessageCircle /><span>A fan pays and writes — the question lands in your Messages</span></p>
        <p><FiClock /><span>You answer when it suits you — a 48-hour window</span></p>
        <p><FiZap /><span>Coins are yours the moment you reply · no reply — auto-refund</span></p>
      </div>
      <p className="direct-settings-note">Priority messages are the most common first purchase a fan makes.</p>

      <section className="direct-settings-option">
        <div className="direct-settings-option-head"><FiZap /><h3>Priority messages</h3><Toggle checked={Boolean(settings.enabled)} disabled={busy} label="Enable priority messages" onChange={(enabled) => update({ enabled })} /></div>
        <div className="direct-settings-choices">{MESSAGE_PRICES.map((price) => <Choice active={messagePrice === price} disabled={busy || !settings.enabled} key={price} onClick={() => update({ priceStars: price })}>🪙{price}</Choice>)}</div>
        <small>${(messagePrice / 10 * .68).toFixed(2)} to you · instantly</small>
      </section>

      <section className="direct-settings-option">
        <div className="direct-settings-option-head"><FiPhone /><h3>Calls</h3><Toggle checked={Boolean(settings.callEnabled)} disabled={busy} label="Enable calls" onChange={(callEnabled) => update({ callEnabled })} /></div>
        <div className="direct-settings-choices">{CALL_PRICES.map((price) => <Choice active={callPrice === price} disabled={busy || !settings.callEnabled} key={price} onClick={() => update({ callPriceStars: price })}>🪙{price.toLocaleString()}</Choice>)}</div>
        <div className="direct-settings-choices is-duration">{CALL_LENGTHS.map((minutes) => <Choice active={Number(settings.callDurationMinutes) === minutes} disabled={busy || !settings.callEnabled} key={minutes} onClick={() => update({ callDurationMinutes: minutes })}>{minutes} min</Choice>)}</div>
        <small>${(callPrice / 10 * .68).toFixed(2)} to you for {settings.callDurationMinutes || 5} min · you confirm the slot</small>
      </section>

      <section className="direct-settings-estimate"><small>A CALL MONTH LIKE THIS</small><strong><span>≈</span> ${estimatedUsd.toFixed(2)} <em>to you</em></strong><p>12 answers · 4 calls — at your own pace</p></section>
      <label className="direct-settings-refund"><input checked={Boolean(settings.callAutoDeclineAway)} disabled={busy} onChange={(event) => update({ callAutoDeclineAway: event.target.checked })} type="checkbox" /><span>No reply in 48h? Coins go back to the fan automatically — trust stays.</span></label>
      {error ? <p className="direct-settings-error" role="alert">{error}</p> : null}
      <button className="direct-settings-save" disabled={busy} onClick={onSave} type="button">{busy ? "Saving…" : "Save"}</button>
    </section>
  </div>;
}
