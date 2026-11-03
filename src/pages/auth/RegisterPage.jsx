import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiLoader, FiX } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { profileService } from "../../services/profileService";
import { onboardingService } from "../../services/onboardingService";
import { clearPreAuthInterests, readPreAuthInterests } from "../../utils/preAuthOnboarding";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", dateOfBirth: "" });
  const [usernameState, setUsernameState] = useState({ status: "idle", message: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const username = form.username.trim();
    if (!username || username.length < 2 || !/^[a-z0-9_.]+$/.test(username)) { setUsernameState({ status: "idle", message: username ? "Use lowercase letters, numbers, _ or ." : "" }); return undefined; }
    let active = true; setUsernameState({ status: "checking", message: "Checking…" });
    const timer = window.setTimeout(() => profileService.checkUsername(username).then((response) => { if (active) setUsernameState(response.data.data.available ? { status: "available", message: `@${username} is available` } : { status: "unavailable", message: `@${username} is taken` }); }).catch(() => active && setUsernameState({ status: "unavailable", message: "Couldn’t check this username" })), 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [form.username]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (usernameState.status !== "available") return setError("Choose an available username.");
    setSubmitting(true);
    try {
      await register({ name: `${form.firstName} ${form.lastName}`.trim(), username: form.username, email: form.email, password: form.password, dateOfBirth: form.dateOfBirth, preferredLanguage: language, referralCode: searchParams.get("ref") || undefined });
      await onboardingService.saveWelcomeStep();
      const interests = readPreAuthInterests();
      if (interests.length >= 3) {
        await onboardingService.saveInterests(interests);
        clearPreAuthInterests();
        navigate("/onboarding/account-type", { replace: true });
      } else navigate("/onboarding/interests", { replace: true });
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to create your account."); }
    finally { setSubmitting(false); }
  };

  const field = "w-full rounded-[14px] border border-white/10 bg-white/[.055] px-4 py-4 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#9CCBFF]/60";
  return <main className="min-h-[100dvh] px-6 pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))] sm:px-8">
    <header className="flex items-center gap-4"><Link aria-label="Back to login" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.07] text-white/75 active:scale-[.97]" to="/login"><FiArrowLeft /></Link><div><h1 className="text-xl font-black">Create account</h1><p className="mt-0.5 text-xs text-white/40">Real name, real you.</p></div></header>
    <form className="mt-8" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3"><input autoComplete="given-name" autoFocus className={field} onChange={(event) => set("firstName", event.target.value)} placeholder="First name" required value={form.firstName} /><input autoComplete="family-name" className={field} onChange={(event) => set("lastName", event.target.value)} placeholder="Last name" required value={form.lastName} /></div>
      <div className="relative mt-3"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#9CCBFF]">@</span><input autoComplete="username" className={`${field} pl-9 pr-12`} maxLength={30} onChange={(event) => set("username", event.target.value.replace(/^@+/, "").toLowerCase().replace(/\s/g, ""))} placeholder="username" required value={form.username} /><span className="absolute right-4 top-1/2 -translate-y-1/2">{usernameState.status === "checking" ? <FiLoader className="animate-spin text-white/40" /> : usernameState.status === "available" ? <FiCheck className="text-emerald-400" /> : usernameState.status === "unavailable" ? <FiX className="text-red-300" /> : null}</span></div>
      {usernameState.message ? <p className={`mt-1.5 px-1 text-[11px] ${usernameState.status === "available" ? "text-emerald-400" : "text-white/40"}`}>{usernameState.message}</p> : null}
      <input autoComplete="email" className={`${field} mt-3`} onChange={(event) => set("email", event.target.value)} placeholder="Email or phone" required type="email" value={form.email} />
      <input autoComplete="new-password" className={`${field} mt-3`} minLength={8} onChange={(event) => set("password", event.target.value)} placeholder="Password (8+ characters)" required type="password" value={form.password} />
      <label className="mt-3 block"><span className="mb-1.5 block px-1 text-[11px] text-white/40">Birthday · private</span><input className={`${field} [color-scheme:dark]`} max={new Date().toISOString().slice(0, 10)} onChange={(event) => set("dateOfBirth", event.target.value)} required type="date" value={form.dateOfBirth} /></label>
      <p className="mt-4 text-[10.5px] leading-[1.6] text-white/35">By tapping Create account you agree to the <span className="text-[#9CCBFF]">Terms of Service</span> and <span className="text-[#9CCBFF]">Privacy Policy</span>. Your birthday won’t be public.</p>
      {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p> : null}
      <button className="mt-5 w-full rounded-[14px] bg-[#9CCBFF] py-4 text-sm font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-45" disabled={submitting || usernameState.status !== "available"} type="submit">{submitting ? "Creating account…" : "Create account"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-white/45">Already have an account? <Link className="font-bold text-white" to="/login">Log in</Link></p>
  </main>;
}
