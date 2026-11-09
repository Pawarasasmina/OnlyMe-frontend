import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FaApple } from "react-icons/fa";
import LegalDocumentSheet from "../../components/auth/LegalDocumentSheet";
import AtseenEyeMark from "../../components/onboarding/AtseenEyeMark";
import { useAuth } from "../../hooks/useAuth";
import { destinationForUser } from "../../utils/socialAccess";
import { onboardingService } from "../../services/onboardingService";
import { clearPreAuthInterests, readPreAuthInterests } from "../../utils/preAuthOnboarding";
import { consumeSessionReturnTo } from "../../utils/sessionExpiry";

export default function LoginPage() {
  __useUiLanguage();
  const { login, resumeTrustedSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [legalDocument, setLegalDocument] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [postLoginTarget, setPostLoginTarget] = useState("");
  const [lastUser] = useState(() => { try { return JSON.parse(localStorage.getItem("onlyme_last_user") || "null"); } catch { return null; } });
  const googleHandled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleError = params.get("google_error");
    if (googleError) { setError(googleError); return; }
    if (params.get("google") !== "success" || googleHandled.current) return;
    googleHandled.current = true;
    setSubmitting(true);
    resumeTrustedSession().then((nextUser) => {
      localStorage.setItem("onlyme_last_user", JSON.stringify({ name: nextUser.name, username: nextUser.username, email: nextUser.email, avatar: nextUser.avatar || "" }));
      setPostLoginTarget(destinationForUser(nextUser));
    }).catch((requestError) => setError(requestError.response?.data?.message || __msg("auth.googleSignInCouldNotBeCompleted"))).finally(() => setSubmitting(false));
  }, [location.search, resumeTrustedSession]);

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
        setPostLoginTarget("/onboarding/account-type");
        return;
      }
      const requested = location.state?.from?.pathname || consumeSessionReturnTo();
      const target = requested && requested !== "/login" ? requested : destinationForUser(user);
      if (user.role === "admin") navigate(target, { replace: true });
      else setPostLoginTarget(target);
    } catch (requestError) {
      const status = requestError.response?.status;
      if (["ADMIN_2FA_REQUIRED", "TWO_FACTOR_REQUIRED"].includes(requestError.response?.data?.code)) setTwoFactorRequired(true);
      setError(status === 429 ? __msg("auth.tooManyAttemptsTryAgainInAFew") : requestError.response?.data?.message || __msg("auth.unableToSignInPleaseTryAgain"));
    } finally { setSubmitting(false); }
  };

  const finishLogin = (saveOneTap) => {
    if (saveOneTap) localStorage.setItem("onlyme_one_tap_enabled", "true");
    else localStorage.removeItem("onlyme_one_tap_enabled");
    navigate(postLoginTarget || "/wall", { replace: true });
  };

  return <><main className="flex min-h-[100dvh] flex-col px-6 pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(44px,env(safe-area-inset-top))] sm:px-8">
    <div className="flex flex-1 flex-col justify-center">
      <div className="flex flex-col items-center"><AtseenEyeMark className="h-14 w-20" /><div className="mt-3 text-[27px] font-black tracking-[-.04em]"><span className="text-[#9CCBFF]">@</span>seen</div><p className="mt-2 text-xs tracking-wide text-white/40">{__msg("data.realPeopleRealWorlds")}</p></div>

      {lastUser?.email ? <button className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-3 text-left active:scale-[.97]" onClick={() => setForm((current) => ({ ...current, email: lastUser.email }))} type="button">{lastUser.avatar ? <img alt="" className="h-11 w-11 rounded-full object-cover" src={lastUser.avatar} /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[#9CCBFF]/15 font-black text-[#9CCBFF]">{lastUser.name?.[0]}</span>}<span className="min-w-0"><b className="block truncate text-sm">{__msg("system.LoginPage.20392d2bee")} {lastUser.name}</b><small className="block truncate text-white/40">{lastUser.email}</small></span></button> : null}

      <form className={lastUser?.email ? "mt-4" : "mt-10"} onSubmit={submit}>
        <input autoComplete="email" autoFocus className="w-full rounded-[14px] border border-white/10 bg-white/[.055] px-4 py-4 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#9CCBFF]/60" onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} placeholder={__msg("system.LoginPage.5a698f5f3b")} required type="email" value={form.email} />
        <div className="relative mt-3"><input autoComplete="current-password" className="w-full rounded-[14px] border border-white/10 bg-white/[.055] px-4 py-4 pr-12 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#9CCBFF]/60" minLength={8} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} placeholder={__msg("auth.password")} required type={showPassword ? "text" : "password"} value={form.password} /><button aria-label={showPassword ? __msg("system.LoginPage.e40123b4e7") : __msg("system.LoginPage.044b852f30")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <FiEyeOff /> : <FiEye />}</button></div>
        {twoFactorRequired ? <input autoComplete="one-time-code" className="mt-3 w-full rounded-[14px] border border-[#9CCBFF]/40 bg-white/[.055] px-4 py-4 text-center text-xl font-black tracking-[.35em] text-white outline-none" inputMode="numeric" maxLength="6" onChange={(event) => setForm((value) => ({ ...value, twoFactorCode: event.target.value.replace(/\D/g, "") }))} placeholder="000000" required value={form.twoFactorCode || ""} /> : null}
        {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{__systemMessage(error)}</p> : null}
        <button className="mt-4 w-full rounded-[14px] bg-[#9CCBFF] py-4 text-sm font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-50" disabled={submitting} type="submit">{submitting ? __msg("system.LoginPage.77489fff08") : __msg("system.ForgotPasswordPage.f7c400ed69")}</button>
      </form>
      <Link className="mt-4 text-center text-[13px] text-white/55" to="/forgot-password">{__msg("auth.forgotPassword")}</Link>
      <div className="my-6 flex items-center gap-3"><i className="h-px flex-1 bg-white/10" /><span className="text-[10px] font-bold text-white/30">{__msg("system.LoginPage.f579c52396")}</span><i className="h-px flex-1 bg-white/10" /></div>
      <button className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[.045] py-3.5 text-sm font-bold active:scale-[.97]" type="button"><FaApple aria-hidden="true" className="shrink-0 text-[17px] text-white" /> {__msg("system.LoginPage.01ca4c21ba")}</button>
      <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[.045] py-3.5 text-sm font-bold active:scale-[.97]" onClick={() => { const api = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"; window.location.assign(`${api}/auth/google`); }} type="button"><b className="text-[#9CCBFF]">G</b> {__msg("system.LoginPage.ccc5b0edaa")}</button>
      <p className="mt-4 text-center text-[10px] leading-4 text-white/30">{__msg("system.LoginPage.2678dfa154")} <button className="text-[#9CCBFF]" onClick={() => setLegalDocument("tos")} type="button">{__msg("system.LoginPage.a55a275aa6")}</button> · <button className="text-[#9CCBFF]" onClick={() => setLegalDocument("priv")} type="button">{__msg("settings.privacy")}</button></p>
    </div>
    <Link className="mt-8 block w-full rounded-[14px] border border-[#9CCBFF]/40 py-3.5 text-center text-sm font-black text-[#9CCBFF] active:scale-[.97]" to="/start/interests">{__msg("welcome.createNewAccount")}</Link>
  </main>{legalDocument ? <LegalDocumentSheet documentKey={legalDocument} onChange={setLegalDocument} onClose={() => setLegalDocument(null)} /> : null}{postLoginTarget ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:p-4" role="presentation"><section aria-labelledby="save-login-title" aria-modal="true" className="w-full max-w-[470px] rounded-t-[28px] border border-white/10 bg-[#11161C] px-6 pb-[max(26px,env(safe-area-inset-bottom))] pt-3 text-white shadow-2xl sm:rounded-[28px]" role="dialog"><span className="mx-auto block h-1 w-11 rounded-full bg-white/20" /><div className="mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#9CCBFF]/10 text-xl text-[#9CCBFF]">✓</div><h2 className="mt-4 text-xl font-black" id="save-login-title">{__msg("system.LoginPage.0cfd1552df")}</h2><p className="mt-2 text-sm leading-6 text-white/55">{__msg("system.LoginPage.d113617820")}</p><button className="mt-6 w-full rounded-2xl bg-[#9CCBFF] py-3.5 text-sm font-black text-[#07101A]" onClick={() => finishLogin(true)} type="button">{__msg("system.LoginPage.a910528053")}</button><button className="mt-2 w-full py-3 text-sm font-bold text-white/55" onClick={() => finishLogin(false)} type="button">{__msg("system.LoginPage.e457149073")}</button></section></div> : null}</>;
}
