import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { authService } from "../../services/authService";

export default function ResetPasswordPage() {
  __useUiLanguage();
  const { token = "" } = useParams();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (form.password.length < 8) return setError(__msg("system.ResetPasswordPage.17ca64d916"));
    if (form.password !== form.confirmPassword) return setError(__msg("system.ResetPasswordPage.f7c3cd4759"));
    setSubmitting(true);
    try { await authService.resetPassword(token, form.password); setComplete(true); }
    catch (requestError) { setError(requestError.response?.data?.message || __msg("auth.thisResetLinkIsInvalidOrHasExpired")); }
    finally { setSubmitting(false); }
  };

  const field = "w-full rounded-[14px] border border-white/10 bg-[#11151B] px-4 py-[15px] pr-12 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#9CCBFF]/60";
  return <main className="flex min-h-[100dvh] flex-col bg-[#05080B] px-[21px] pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(21px,env(safe-area-inset-top))] text-white">
    <header className="flex items-center gap-3"><Link aria-label={__msg("system.ForgotPasswordPage.4b675616a2")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.07] text-xl text-white/80 active:scale-[.97]" to="/login"><FiArrowLeft /></Link><h1 className="text-[20px] font-black tracking-[-.025em]">{__msg("system.ResetPasswordPage.6c752fbec7")}</h1></header>
    <section className="mt-14">
      <span className="grid h-14 w-14 place-items-center rounded-[18px] border border-[#9CCBFF]/20 bg-[#9CCBFF]/10 text-[24px] text-[#9CCBFF]">{complete ? <FiCheck /> : <FiLock />}</span>
      <h2 className="mt-5 text-[27px] font-black leading-tight tracking-[-.035em]">{complete ? __msg("system.ResetPasswordPage.1de6d0816c") : __msg("system.ResetPasswordPage.3f657f29e6")}</h2>
      <p className="mt-2 text-[14px] leading-6 text-white/55">{complete ? __msg("system.ResetPasswordPage.63fa9dacb5") : __msg("system.ResetPasswordPage.52cfd23521")}</p>
      {complete ? <Link className="mt-7 block w-full rounded-[14px] bg-[#9CCBFF] py-4 text-center text-[15px] font-black text-[#07101A] active:scale-[.97]" replace to="/login">{__msg("system.ResetPasswordPage.d8fad1ba6d")}</Link> : <form className="mt-7" onSubmit={submit}>
        <div className="relative"><input autoComplete="new-password" autoFocus className={field} minLength={8} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} placeholder={__msg("system.ResetPasswordPage.7047b72e0f")} required type={showPassword ? "text" : "password"} value={form.password} /><button aria-label={showPassword ? __msg("system.LoginPage.e40123b4e7") : __msg("system.LoginPage.044b852f30")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <FiEyeOff /> : <FiEye />}</button></div>
        <input autoComplete="new-password" className={`${field} mt-3`} minLength={8} onChange={(event) => setForm((value) => ({ ...value, confirmPassword: event.target.value }))} placeholder={__msg("admin.confirmNewPassword")} required type={showPassword ? "text" : "password"} value={form.confirmPassword} />
        {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{__systemMessage(error)}</p> : null}
        <button className="mt-4 w-full rounded-[14px] bg-[#9CCBFF] py-4 text-[15px] font-black text-[#07101A] active:scale-[.97] disabled:opacity-50" disabled={submitting} type="submit">{submitting ? __msg("system.ResetPasswordPage.3ab0d73100") : __msg("auth.resetPassword")}</button>
      </form>}
    </section>
  </main>;
}
