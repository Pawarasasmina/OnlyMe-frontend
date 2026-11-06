/* i18n-source-migrated */
import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { authService } from "../../services/authService";

function ForgotPasswordPage() {
  __useUiLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send the reset email. Please try again.");
    } finally { setSubmitting(false); }
  };

  return <main className="flex min-h-[100dvh] flex-col bg-[#05080B] px-[21px] pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(21px,env(safe-area-inset-top))] text-white">
    <header className="flex items-center gap-3"><Link aria-label="Back to login" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.07] text-xl text-white/80 active:scale-[.97]" to="/login"><FiArrowLeft /></Link><h1 className="text-[20px] font-black tracking-[-.025em]">{__msg("auth.resetPassword")}</h1></header>
    <section className="mt-14">
      <span className="grid h-14 w-14 place-items-center rounded-[18px] border border-[#9CCBFF]/20 bg-[#9CCBFF]/10 text-[24px] text-[#9CCBFF]"><FiMail /></span>
      <h2 className="mt-5 text-[27px] font-black leading-tight tracking-[-.035em]">{sent ? "Check your email" : "Forgot your password?"}</h2>
      <p className="mt-2 max-w-[380px] text-[14px] leading-6 text-white/55">{sent ? <>If an account exists for <b className="text-white/80">{email}</b>, a reset link is on its way. The link expires in 30 minutes.</> : "Enter the email connected to your account and we’ll send you a secure reset link."}</p>
      <form className="mt-7" onSubmit={submit}>
        <input aria-label={__msg("auth.email")} autoComplete="email" autoFocus={!sent} className="w-full rounded-[14px] border border-white/10 bg-[#11151B] px-4 py-[15px] text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#9CCBFF]/60 disabled:opacity-60" disabled={sent} onChange={(event) => setEmail(event.target.value)} placeholder={__msg("auth.youExampleCom")} required type="email" value={email} />
        {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p> : null}
        {sent ? <button className="mt-4 w-full rounded-[14px] border border-[#9CCBFF]/35 py-4 text-[15px] font-black text-[#9CCBFF] active:scale-[.97]" onClick={() => setSent(false)} type="button">Try another email</button> : <button className="mt-4 w-full rounded-[14px] bg-[#9CCBFF] py-4 text-[15px] font-black text-[#07101A] active:scale-[.97] disabled:opacity-50" disabled={submitting} type="submit">{submitting ? "Sending…" : __msg("auth.sendResetLink")}</button>}
      </form>
      <p className="mt-5 text-center text-[13px] text-white/45">Remembered your password? <Link className="font-bold text-[#9CCBFF]" to="/login">Log in</Link></p>
    </section>
  </main>;
}

export default ForgotPasswordPage;
