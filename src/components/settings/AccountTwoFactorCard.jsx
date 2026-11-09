import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiCopy, FiShield } from "react-icons/fi";
import QRCode from "qrcode";
import { profileService } from "../../services/profileService";
import { useAuth } from "../../hooks/useAuth";

export default function AccountTwoFactorCard() {
  __useUiLanguage();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const status = useQuery({ queryKey: ["account-two-factor"], queryFn: () => profileService.getTwoFactorStatus().then((response) => response.data.data) });
  const [setup, setSetup] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [disableForm, setDisableForm] = useState({ currentPassword: "", code: "" });
  const [showDisable, setShowDisable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finishWithLogin = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const begin = async () => {
    setBusy(true); setError("");
    try {
      const response = await profileService.beginTwoFactorSetup();
      const next = response.data.data;
      setSetup(next);
      setQrCode(await QRCode.toDataURL(next.uri, { width: 280, margin: 2, color: { dark: "#020617", light: "#ffffff" }, errorCorrectionLevel: "M" }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || __msg("settings.unableToStartAuthenticatorSetup"));
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true); setError("");
    try {
      await profileService.confirmTwoFactorSetup(code);
      await finishWithLogin();
    } catch (requestError) {
      setError(requestError.response?.data?.message || __msg("settings.unableToVerifyThisAuthenticatorCode"));
      setBusy(false);
    }
  };

  const disable = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await profileService.disableTwoFactor(disableForm);
      await finishWithLogin();
    } catch (requestError) {
      setError(requestError.response?.data?.message || __msg("settings.unableToDisableTwoFactorAuthentication"));
      setBusy(false);
    }
  };

  const enabled = Boolean(status.data?.enabled);
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-atseen-blue/10 text-atseen-blue"><FiShield size={19} /></span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{__msg("system.AccountTwoFactorCard.edfd617aa5")}</h2>{enabled ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300"><FiCheckCircle /> {__msg("fan.active")}</span> : null}</div><p className="mt-1 text-sm leading-6 text-brand-mist/60">{__msg("system.AccountTwoFactorCard.ba48121f53")}</p></div>
    </div>
    {status.isLoading ? <div className="h-12 animate-pulse rounded-xl bg-white/5" /> : null}
    {error ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{__systemMessage(error)}</p> : null}
    {!status.isLoading && !enabled && !setup ? <button className="rounded-full bg-atseen-blue px-5 py-3 text-sm font-bold text-atseen-bg disabled:opacity-50" disabled={busy} onClick={begin} type="button">{busy ? __msg("system.AccountTwoFactorCard.0b1d6c0b1a") : __msg("system.AccountTwoFactorCard.4555ecd3e5")}</button> : null}
    {setup ? <div className="space-y-5 border-t border-white/[0.07] pt-5"><div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-center"><p className="text-sm font-bold">{__msg("system.AccountTwoFactorCard.cf5504cf70")}</p><p className="mt-1 text-xs text-brand-mist/50">{__msg("system.AccountTwoFactorCard.418aa40378")}</p>{qrCode ? <img alt={__msg("system.AccountTwoFactorCard.694366748d")} className="mx-auto mt-4 w-full max-w-[240px] rounded-2xl bg-white p-2" src={qrCode} /> : null}<details className="mt-4 text-left"><summary className="cursor-pointer text-xs font-bold text-atseen-blue">{__msg("system.AccountTwoFactorCard.86498182fb")}</summary><div className="mt-3 flex items-center gap-2 rounded-xl bg-black/30 p-3"><code className="min-w-0 flex-1 break-all text-xs font-bold tracking-wider text-atseen-blue">{setup.secret}</code><button aria-label={__msg("system.AccountTwoFactorCard.ddbfdf8c1e")} className="rounded-lg bg-white/10 p-2" onClick={() => navigator.clipboard.writeText(setup.secret)} type="button"><FiCopy /></button></div></details></div><label className="block text-sm font-medium text-brand-mist/80">{__msg("system.AccountTwoFactorCard.e794fe5008")}<input autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-white/10 bg-brand-dark p-4 text-center text-2xl font-black tracking-[.35em] text-white outline-none focus:border-atseen-blue" inputMode="numeric" maxLength="6" onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} value={code} /></label><button className="w-full rounded-xl bg-atseen-blue py-3.5 text-sm font-bold text-atseen-bg disabled:opacity-40" disabled={busy || code.length !== 6} onClick={confirm} type="button">{busy ? __msg("system.AccountTwoFactorCard.691f4302fc") : __msg("system.AccountTwoFactorCard.89677dee33")}</button></div> : null}
    {enabled && !showDisable ? <button className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/75 hover:bg-white/5" onClick={() => setShowDisable(true)} type="button">{__msg("system.AccountTwoFactorCard.caeac6b931")}</button> : null}
    {enabled && showDisable ? <form className="space-y-4 border-t border-white/[0.07] pt-5" onSubmit={disable}><p className="text-sm text-brand-mist/60">{__msg("system.AccountTwoFactorCard.e8a9f8ea5a")}</p><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-brand-mist/80">{__msg("admin.currentPassword")}<input autoComplete="current-password" className="mt-2 w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 text-white outline-none focus:border-atseen-blue" onChange={(event) => setDisableForm((value) => ({ ...value, currentPassword: event.target.value }))} required type="password" value={disableForm.currentPassword} /></label><label className="text-sm text-brand-mist/80">{__msg("system.AccountTwoFactorCard.52e07d3b35")}<input autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 text-center font-bold tracking-[.25em] text-white outline-none focus:border-atseen-blue" inputMode="numeric" maxLength="6" onChange={(event) => setDisableForm((value) => ({ ...value, code: event.target.value.replace(/\D/g, "") }))} required value={disableForm.code} /></label></div><div className="flex flex-wrap justify-end gap-2"><button className="rounded-full px-4 py-2.5 text-sm font-bold text-white/60" onClick={() => setShowDisable(false)} type="button">{__msg("admin.cancel")}</button><button className="rounded-full border border-red-400/30 px-4 py-2.5 text-sm font-bold text-red-200 disabled:opacity-40" disabled={busy || disableForm.code.length !== 6} type="submit">{busy ? __msg("system.AccountTwoFactorCard.3bf14ecdc8") : __msg("system.AccountTwoFactorCard.2e35cd94b4")}</button></div></form> : null}
  </section>;
}
