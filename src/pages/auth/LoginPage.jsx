import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import AtseenEyeMark from "../../components/onboarding/AtseenEyeMark";
import { useAuth } from "../../hooks/useAuth";
import { destinationForUser } from "../../utils/socialAccess";
import { onboardingService } from "../../services/onboardingService";
import { clearPreAuthInterests, readPreAuthInterests } from "../../utils/preAuthOnboarding";
import { consumeSessionReturnTo } from "../../utils/sessionExpiry";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [lastUser] = useState(() => { try { return JSON.parse(localStorage.getItem("onlyme_last_user") || "null"); } catch { return null; } });

  const submit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await login(form);
      const user = response.data.data.user;
      const interests = readPreAuthInterests();
      if (interests.length >= 3 && !["completed", "skipped"].includes(user.onboarding?.status)) {
        if (!user.onboarding?.welcomeCompleted) await onboardingService.saveWelcomeStep();
        await onboardingService.saveInterests(interests);
        clearPreAuthInterests();
        navigate("/onboarding/account-type", { replace: true });
        return;
      }
      const requested = location.state?.from?.pathname || consumeSessionReturnTo();
      navigate(requested && requested !== "/login" ? requested : destinationForUser(user), { replace: true });
    } catch (requestError) {
      const status = requestError.response?.status;
      if (["ADMIN_2FA_REQUIRED", "TWO_FACTOR_REQUIRED"].includes(requestError.response?.data?.code)) setTwoFactorRequired(true);
      setError(status === 429 ? "Too many attempts. Try again in a few minutes." : requestError.response?.data?.message || "Unable to sign in. Please try again.");
    } finally { setSubmitting(false); }
  };

  return <main className="flex min-h-[100dvh] flex-col px-6 pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(44px,env(safe-area-inset-top))] sm:px-8">
    <div className="flex flex-1 flex-col justify-center">
      <div className="flex flex-col items-center"><AtseenEyeMark className="h-14 w-20" /><div className="mt-3 text-[27px] font-black tracking-[-.04em]"><span className="text-[#9CCBFF]">@</span>seen</div><p className="mt-2 text-xs tracking-wide text-white/40">Real people. Real worlds.</p></div>

      {lastUser?.email ? <button className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-3 text-left active:scale-[.97]" onClick={() => setForm((current) => ({ ...current, email: lastUser.email }))} type="button">{lastUser.avatar ? <img alt="" className="h-11 w-11 rounded-full object-cover" src={lastUser.avatar} /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[#9CCBFF]/15 font-black text-[#9CCBFF]">{lastUser.name?.[0]}</span>}<span className="min-w-0"><b className="block truncate text-sm">Continue as {lastUser.name}</b><small className="block truncate text-white/40">{lastUser.email}</small></span></button> : null}

      <form className={lastUser?.email ? "mt-4" : "mt-10"} onSubmit={submit}>
        <input autoComplete="email" autoFocus className="w-full rounded-[14px] border border-white/10 bg-white/[.055] px-4 py-4 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#9CCBFF]/60" onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} placeholder="Email or phone" required type="email" value={form.email} />
        <div className="relative mt-3"><input autoComplete="current-password" className="w-full rounded-[14px] border border-white/10 bg-white/[.055] px-4 py-4 pr-12 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#9CCBFF]/60" minLength={8} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} placeholder="Password" required type={showPassword ? "text" : "password"} value={form.password} /><button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <FiEyeOff /> : <FiEye />}</button></div>
        {twoFactorRequired ? <input autoComplete="one-time-code" className="mt-3 w-full rounded-[14px] border border-[#9CCBFF]/40 bg-white/[.055] px-4 py-4 text-center text-xl font-black tracking-[.35em] text-white outline-none" inputMode="numeric" maxLength="6" onChange={(event) => setForm((value) => ({ ...value, twoFactorCode: event.target.value.replace(/\D/g, "") }))} placeholder="000000" required value={form.twoFactorCode || ""} /> : null}
        {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p> : null}
        <button className="mt-4 w-full rounded-[14px] bg-[#9CCBFF] py-4 text-sm font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-50" disabled={submitting} type="submit">{submitting ? "Logging in…" : "Log in"}</button>
      </form>
      <Link className="mt-4 text-center text-[13px] text-white/55" to="/forgot-password">Forgot password?</Link>
      <div className="my-6 flex items-center gap-3"><i className="h-px flex-1 bg-white/10" /><span className="text-[10px] font-bold text-white/30">OR</span><i className="h-px flex-1 bg-white/10" /></div>
      <button className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[.045] py-3.5 text-sm font-bold active:scale-[.97]" type="button"><span className="text-lg">●</span> Continue with Apple</button>
      <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[.045] py-3.5 text-sm font-bold active:scale-[.97]" type="button"><b className="text-[#9CCBFF]">G</b> Continue with Google</button>
      <p className="mt-4 text-center text-[10px] leading-4 text-white/30">By continuing you agree to the <Link className="text-[#9CCBFF]" to="/settings/support/terms">Terms</Link> · <Link className="text-[#9CCBFF]" to="/settings/support/terms">Privacy</Link></p>
    </div>
    <Link className="mt-8 block w-full rounded-[14px] border border-[#9CCBFF]/40 py-3.5 text-center text-sm font-black text-[#9CCBFF] active:scale-[.97]" state={{ fromInterests: Boolean(location.state?.fromInterests) }} to="/register">Create new account</Link>
  </main>;
}
