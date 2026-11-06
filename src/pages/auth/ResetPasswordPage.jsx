import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { authService } from "../../services/authService";

export default function ResetPasswordPage() {
  const { token = "" } = useParams();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setSubmitting(true);
    try { await authService.resetPassword(token, form.password); setComplete(true); }
    catch (requestError) { setError(requestError.response?.data?.message || "This reset link is invalid or has expired."); }
    finally { setSubmitting(false); }
  };

  const field = "w-full rounded-[14px] border border-white/10 bg-[#11151B] px-4 py-[15px] pr-12 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#9CCBFF]/60";
  return <main className="flex min-h-[100dvh] flex-col bg-[#05080B] px-[21px] pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(21px,env(safe-area-inset-top))] text-white">
    <header className="flex items-center gap-3"><Link aria-label="Back to login" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.07] text-xl text-white/80 active:scale-[.97]" to="/login"><FiArrowLeft /></Link><h1 className="text-[20px] font-black tracking-[-.025em]">Create new password</h1></header>
    <section className="mt-14">
      <span className="grid h-14 w-14 place-items-center rounded-[18px] border border-[#9CCBFF]/20 bg-[#9CCBFF]/10 text-[24px] text-[#9CCBFF]">{complete ? <FiCheck /> : <FiLock />}</span>
      <h2 className="mt-5 text-[27px] font-black leading-tight tracking-[-.035em]">{complete ? "Password updated" : "Choose a new password"}</h2>
      <p className="mt-2 text-[14px] leading-6 text-white/55">{complete ? "Your password was changed successfully. Sign in again on your devices using the new password." : "Use at least 8 characters. Choose something you don’t use on another account."}</p>
      {complete ? <Link className="mt-7 block w-full rounded-[14px] bg-[#9CCBFF] py-4 text-center text-[15px] font-black text-[#07101A] active:scale-[.97]" replace to="/login">Continue to login</Link> : <form className="mt-7" onSubmit={submit}>
        <div className="relative"><input autoComplete="new-password" autoFocus className={field} minLength={8} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} placeholder="New password (8+ characters)" required type={showPassword ? "text" : "password"} value={form.password} /><button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <FiEyeOff /> : <FiEye />}</button></div>
        <input autoComplete="new-password" className={`${field} mt-3`} minLength={8} onChange={(event) => setForm((value) => ({ ...value, confirmPassword: event.target.value }))} placeholder="Confirm new password" required type={showPassword ? "text" : "password"} value={form.confirmPassword} />
        {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p> : null}
        <button className="mt-4 w-full rounded-[14px] bg-[#9CCBFF] py-4 text-[15px] font-black text-[#07101A] active:scale-[.97] disabled:opacity-50" disabled={submitting} type="submit">{submitting ? "Updating…" : "Reset password"}</button>
      </form>}
    </section>
  </main>;
}
