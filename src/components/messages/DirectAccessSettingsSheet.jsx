import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiChevronLeft, FiClock, FiDollarSign, FiMessageCircle, FiPhone, FiZap } from "react-icons/fi";

const MESSAGE_PRICES = [50, 100, 200, 500];
const CALL_PRICES = [100, 300, 500, 800, 1500];
const CALL_LENGTHS = [2, 5, 10, 15, 20, 30];
// The wallet exposes the creator conversion rate maintained in Financial Admin.
import { useQuery } from "@tanstack/react-query";
import { walletService } from "../../services/walletService";
import "./DirectAccessSettingsSheet.css";

function CoinAmount({ value }) {
  __useUiLanguage();
  return <><img className="direct-settings-coin" src="/brand/goldcoin.png" alt="" />{value.toLocaleString(__uiLocale())}</>;
}

function Choice({ active, children, disabled, onClick }) {
  __useUiLanguage();
  return <button aria-pressed={active} className={active ? "is-active" : ""} disabled={disabled} onClick={onClick} type="button">{children}</button>;
}

function Toggle({ checked, disabled, label, onChange }) {
  __useUiLanguage();
  return <button aria-checked={checked} aria-label={label} className={checked ? "is-on direct-settings-toggle" : "direct-settings-toggle"} disabled={disabled} onClick={() => onChange(!checked)} role="switch" type="button"><span /></button>;
}

export default function DirectAccessSettingsSheet({ busy, eligibility, saveDisabled = false, error, onClose, onEligibilityAction, onSave, settings, setSettings }) {
  __useUiLanguage();
  const messagePrice = Number(settings.priceStars) || 100;
  const callPrice = Number(settings.callPriceStars) || 500;
  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet),
  });
  const rate = Number(walletQuery.data?.starsPerUsd);
  const hasRate = Number.isFinite(rate) && rate > 0;
  const money = (value) => hasRate ? new Intl.NumberFormat(__uiLocale(), {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value) : "\u2014";
  const messageEarningUsd = messagePrice / rate;
  const callEarningUsd = callPrice / rate;
  const activationBlocked = eligibility?.allowed === false;
  const callsAvailable = settings.callsAvailable !== false;
  const estimatedUsd = (settings.enabled && !activationBlocked ? messageEarningUsd * 12 : 0)
    + (settings.callEnabled && !activationBlocked ? callEarningUsd * 4 : 0);
  const update = (values) => setSettings((current) => ({ ...current, ...values }));

  return <div className="direct-settings-layer" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section aria-labelledby="direct-access-setup-title" aria-modal="true" className="direct-settings-sheet" role="dialog">
      <header className="direct-settings-header"><button aria-label={__msg("messages.closeDirectAccessSettings")} disabled={busy} onClick={onClose} type="button"><FiChevronLeft data-ui-directional="true" /></button><h2 id="direct-access-setup-title">Direct Access</h2></header>
      <div className="direct-settings-intro"><span aria-hidden="true"><i><FiMessageCircle /></i></span><h3>{__msg("messages.yourTimeOnYourTerms")}</h3><p>{__msg("messages.aPrivateWindowAndALiveVoiceFor")}<br />{__msg("messages.thoseWhoReallyNeedIt")}</p></div>
      <div className="direct-settings-explainer">
        <p><FiMessageCircle /><span>{__msg("messages.aFanPaysAndWritesTheQuestionLandsIn")}</span></p>
        <p><FiClock /><span>{__msg("messages.youAnswerWhenItSuitsYouA48Hour")}</span></p>
        <p><FiDollarSign /><span>{__msg("messages.coinsAreYoursTheMomentYouReplyNoReply")}</span></p>
      </div>
      <p className="direct-settings-note">{__msg("messages.priorityMessagesAreTheMostCommonFirstPurchaseA")}</p>
      {activationBlocked ? <section className="direct-settings-eligibility" role="status"><div><strong>Only you can see this setup</strong><p>{eligibility.message || "Complete monetization eligibility before Direct Access can go live."}</p></div>{onEligibilityAction ? <button onClick={onEligibilityAction} type="button">Complete setup</button> : null}</section> : null}

      <section className="direct-settings-option">
        <div className="direct-settings-option-head"><FiZap /><h3>{__msg("messages.priorityMessages")}</h3><Toggle checked={Boolean(settings.enabled) && !activationBlocked} disabled={busy || activationBlocked} label={__msg("messages.enablePriorityMessages")} onChange={(enabled) => update({ enabled })} /></div>
        <div className="direct-settings-choices">{[...new Set([...MESSAGE_PRICES, messagePrice])].sort((a, b) => a - b).map((price) => <Choice active={messagePrice === price} disabled={busy} key={price} onClick={() => update({ priceStars: price })}><CoinAmount value={price} /></Choice>)}</div>
        <small>{money(messageEarningUsd)} {__msg("messages.toYouInstantly")}{!settings.enabled || activationBlocked ? " · choose your price before going live" : ""}</small>
      </section>

      {callsAvailable ? <section className="direct-settings-option">
        <div className="direct-settings-option-head"><FiPhone /><h3>{__msg("messages.calls")}</h3><Toggle checked={Boolean(settings.callEnabled) && !activationBlocked} disabled={busy || activationBlocked} label={__msg("messages.enableCalls")} onChange={(callEnabled) => update({ callEnabled })} /></div>
        <div className="direct-settings-choices">{[...new Set([...CALL_PRICES, callPrice])].sort((a, b) => a - b).map((price) => <Choice active={callPrice === price} disabled={busy} key={price} onClick={() => update({ callPriceStars: price })}><CoinAmount value={price} /></Choice>)}</div>
        <div className="direct-settings-choices is-duration">{[...new Set([...CALL_LENGTHS, Number(settings.callDurationMinutes)])].filter((value) => value > 0).sort((a, b) => a - b).map((minutes) => <Choice active={Number(settings.callDurationMinutes) === minutes} disabled={busy} key={minutes} onClick={() => update({ callDurationMinutes: minutes })}>{minutes} {__msg("messages.min")}</Choice>)}</div>
        <small>{money(callEarningUsd)} {__msg("messages.toYouFor")} {settings.callDurationMinutes || 5} {__msg("messages.minYouConfirmTheSlot")}{!settings.callEnabled || activationBlocked ? " · choose before going live" : ""}</small>
      </section> : <section className="direct-settings-eligibility" role="status"><div><strong>{__msg("messages.calls")}</strong><p>{settings.callsUnavailableReason || "Calls are unavailable in your country."}</p></div></section>}

      {!activationBlocked && (settings.enabled || settings.callEnabled) && <section className="direct-settings-estimate"><small>{__msg("messages.aCalmMonthLikeThis")}</small><strong><span>≈</span> {money(estimatedUsd)} <em>{__msg("messages.toYou")}</em></strong><p>{__msg("messages.directAccessMonthlyExample", { answers: settings.enabled ? 12 : 0, calls: settings.callEnabled ? 4 : 0 })}</p></section>}
      <div className="direct-settings-refund"><span>{__msg("messages.noReplyIn48hCoinsGoBackToThe")}</span></div>
      {!hasRate && <p className="direct-settings-rate-status" role="status">{walletQuery.isError || (!walletQuery.isPending && !hasRate) ? <>{__msg("settings.balanceUnavailable")} <button onClick={() => walletQuery.refetch()} type="button">{__msg("discover.tryAgain")}</button></> : __msg("settings.loadingBalance")}</p>}
      {error ? <p className="direct-settings-error" role="alert">{__systemMessage(error)}</p> : null}
      <button className="direct-settings-save" disabled={busy || saveDisabled} onClick={() => onSave((activationBlocked || !callsAvailable) ? { ...settings, enabled: activationBlocked ? false : settings.enabled, callEnabled: false } : settings)} type="button">{busy ? __msg("financial.saving") : __msg("contentEntities.save_efc007")}</button>
    </section>
  </div>;
}
