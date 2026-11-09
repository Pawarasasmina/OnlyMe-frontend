import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiCopy, FiShield } from "react-icons/fi";
import QRCode from "qrcode";
import api from "../../api/axiosInstance";
import { useAuth } from "../../hooks/useAuth";

export default function AdminSecuritySetupPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [setup, setSetup] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [disableForm, setDisableForm] = useState({ currentPassword: "", code: "" });
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finishWithLogin = async () => { await logout(); navigate("/login", { replace: true }); };
  const begin = async () => {
    setBusy(true); setError("");
    try {
      const response = await api.post("/admin/security/2fa/setup");
      const nextSetup = response.data.data;
      setSetup(nextSetup);
      setQrCode(await QRCode.toDataURL(nextSetup.uri, { width: 280, margin: 2, color: { dark: "#020617", light: "#ffffff" }, errorCorrectionLevel: "M" }));
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true); setError("");
    try { await api.post("/admin/security/2fa/confirm", { code }); await finishWithLogin(); }
    catch (requestError) { setError(requestError.response?.data?.message || requestError.message); setBusy(false); }
  };
  const disable = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await api.post("/admin/security/2fa/disable", disableForm); await finishWithLogin(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to disable two-factor authentication."); setBusy(false); }
  };

  if (user?.adminTwoFactorEnabled) return <div className="mx-auto max-w-2xl space-y-5">
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
      <div className="flex items-start gap-4"><FiCheckCircle className="mt-1 shrink-0 text-4xl text-emerald-600" /><div><h1 className="text-2xl font-black text-slate-950">Two-factor authentication is active</h1><p className="mt-2 text-sm leading-6 text-emerald-800">Your admin account requires your password and a current authenticator code when you sign in.</p></div></div>
      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{error}</p> : null}
      {!showDisable ? <button className="mt-6 rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-black text-red-700 hover:bg-red-50" onClick={() => setShowDisable(true)} type="button">Turn off 2FA</button> : null}
    </section>
    {showDisable ? <form className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={disable}>
      <h2 className="text-xl font-black text-slate-950">Turn off two-factor authentication?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Confirm your password and current authenticator code. All active sessions will be revoked, and the admin console will remain locked until you enable 2FA again.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">Current password<input autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-orange-500" onChange={(event) => setDisableForm((value) => ({ ...value, currentPassword: event.target.value }))} required type="password" value={disableForm.currentPassword} /></label>
        <label className="text-sm font-bold text-slate-700">Six-digit code<input autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-black tracking-[.25em] text-slate-950 outline-none focus:border-orange-500" inputMode="numeric" maxLength="6" onChange={(event) => setDisableForm((value) => ({ ...value, code: event.target.value.replace(/\D/g, "") }))} required value={disableForm.code} /></label>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2"><button className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600" disabled={busy} onClick={() => { setShowDisable(false); setError(""); }} type="button">Cancel</button><button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40" disabled={busy || !disableForm.currentPassword || disableForm.code.length !== 6} type="submit">{busy ? "Turning off…" : "Turn off 2FA"}</button></div>
    </form> : null}
  </div>;

  return <div className="mx-auto max-w-2xl"><section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><FiShield className="text-4xl text-orange-400" /><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-orange-400">Admin security setup</p><h1 className="mt-2 text-3xl font-black">Protect your admin account</h1><p className="mt-3 text-sm leading-6 text-slate-300">Set up an authenticator to unlock the admin console. You can return to Security &amp; 2FA later to turn it off or configure it again.</p>{error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm font-bold text-red-200" role="alert">{error}</p> : null}{!setup ? <button className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50" disabled={busy} onClick={begin}>{busy ? "Preparing…" : "Set up authenticator"}</button> : <div className="mt-6 space-y-5"><div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center"><p className="text-sm font-bold">1. Scan this QR code with your authenticator app</p><p className="mt-1 text-xs text-slate-400">Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app.</p>{qrCode ? <img alt="OnlyMe administrator authenticator QR code" className="mx-auto mt-4 w-full max-w-[280px] rounded-2xl bg-white p-2" src={qrCode} /> : <div className="mx-auto mt-4 h-64 max-w-64 animate-pulse rounded-2xl bg-white/10" />}<details className="mt-4 text-left"><summary className="cursor-pointer text-xs font-bold text-orange-300">Cannot scan? Enter the setup key manually</summary><div className="mt-3 flex items-center gap-2 rounded-xl bg-black/30 p-3"><code className="min-w-0 flex-1 break-all text-sm font-black tracking-wider text-orange-300">{setup.secret}</code><button aria-label="Copy secret" className="rounded-lg bg-white/10 p-2" onClick={() => navigator.clipboard.writeText(setup.secret)} type="button"><FiCopy /></button></div></details></div><label className="block text-sm font-bold">2. Enter the six-digit code shown in the app<input autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-4 text-center text-2xl font-black tracking-[.4em]" inputMode="numeric" maxLength="6" onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} value={code} /></label><button className="w-full rounded-xl bg-orange-500 py-3.5 font-black disabled:opacity-40" disabled={busy || code.length !== 6} onClick={confirm}>{busy ? "Verifying…" : "Verify and enable 2FA"}</button></div>}</section></div>;
}
