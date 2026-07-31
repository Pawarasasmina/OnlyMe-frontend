import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { FiCheckCircle, FiEye, FiEyeOff, FiLoader, FiXCircle } from "react-icons/fi";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import { destinationForUser } from "../../utils/socialAccess";
import { isEmail, isStrongPassword } from "../../utils/validators";
import { fallbackMessages, normalizeApiError } from "../../utils/apiErrors";

const accountTypes = [
  { value: "fan", label: "Join as a fan" },
  { value: "creator", label: "Become a creator" },
];

function PasswordField({ disabled, error, label, name, onChange, onToggle, value, visible }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-brand-mist/80">{label}</span>
      <span className="flex rounded-2xl border border-white/10 bg-white/5 focus-within:border-brand-primary">
        <input
          aria-describedby={error ? `${name}-error` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="new-password"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/40"
          disabled={disabled}
          minLength={8}
          name={name}
          onChange={onChange}
          required
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="grid w-12 place-items-center text-brand-mist/70 transition hover:text-white disabled:opacity-50"
          disabled={disabled}
          onClick={onToggle}
          type="button"
        >
          {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </button>
      </span>
      {error ? <p className="text-xs text-red-300" id={`${name}-error`}>{error}</p> : null}
    </label>
  );
}

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading, register, user } = useAuth();
  const initialRole = searchParams.get("role") === "creator" ? "creator" : "fan";
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: initialRole,
    termsAccepted: false,
  });
  const [usernameState, setUsernameState] = useState({ status: "idle", message: "Choose your unique username" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [visible, setVisible] = useState({ password: false, confirmPassword: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const username = form.username.trim();
    if (!username) {
      setUsernameState({ status: "idle", message: "Choose your unique username" });
      return undefined;
    }
    if (username.length > 30) {
      setUsernameState({ status: "unavailable", message: "Username must be 30 characters or less" });
      return undefined;
    }
    if (!/^[a-z0-9_.]+$/.test(username)) {
      setUsernameState({ status: "unavailable", message: "Use lowercase letters, numbers, underscores, or periods" });
      return undefined;
    }

    let active = true;
    setUsernameState({ status: "checking", message: "Checking availability..." });
    const timeout = window.setTimeout(() => {
      profileService.checkUsername(username)
        .then((response) => {
          if (!active) return;
          setUsernameState(response.data.data.available
            ? { status: "available", message: `@${username} is available` }
            : { status: "unavailable", message: `@${username} is already taken` });
        })
        .catch((requestError) => {
          if (!active) return;
          const normalized = normalizeApiError(requestError, "Unable to check this username");
          setUsernameState({ status: "unavailable", message: normalized.message });
        });
    }, 450);

    return () => { active = false; window.clearTimeout(timeout); };
  }, [form.username]);

  const update = ({ target }) => {
    const value = target.type === "checkbox" ? target.checked : target.value;
    setForm((current) => ({ ...current, [target.name]: value }));
    setFieldErrors((current) => ({ ...current, [target.name]: "" }));
    setError("");
  };

  const updateUsername = ({ target }) => {
    const username = target.value.replace(/^@+/, "").toLowerCase().replace(/\s/g, "");
    setForm((value) => ({ ...value, username }));
    setFieldErrors((current) => ({ ...current, username: "" }));
    setError("");
  };

  const validate = () => {
    const nextErrors = {};
    const email = form.email.trim();

    if (!form.name.trim()) nextErrors.name = "Please enter your full name.";
    if (!form.username.trim()) nextErrors.username = "Please choose a username.";
    else if (usernameState.status !== "available") nextErrors.username = "Please choose an available username.";
    if (!email) nextErrors.email = "Please enter your email address.";
    else if (!isEmail(email)) nextErrors.email = "Please enter a valid email address.";
    if (!isStrongPassword(form.password)) nextErrors.password = "Password must include at least 8 characters, uppercase, lowercase, and a number.";
    if (!form.confirmPassword) nextErrors.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    if (!["fan", "creator"].includes(form.role)) nextErrors.role = "Please select a valid account type.";
    if (!form.termsAccepted) nextErrors.termsAccepted = "Please accept the terms and conditions.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        ...form,
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
      });
      navigate("/onboarding/welcome", { replace: true });
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, "Unable to create your account right now. Please try again.");
      setFieldErrors(normalized.errors || {});
      setError(normalized.message || fallbackMessages.validation);
    } finally {
      setSubmitting(false);
    }
  };

  const usernameBorder = usernameState.status === "available"
    ? "border-emerald-400 ring-1 ring-emerald-400/20"
    : usernameState.status === "unavailable" || fieldErrors.username
      ? "border-red-400 ring-1 ring-red-400/20"
      : "border-white/10 focus-within:border-brand-primary";

  if (!loading && user) {
    return <Navigate replace to={destinationForUser(user)} />;
  }

  return <div>
    <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/">Back to creators</Link>
    <h1 className="text-3xl font-bold">Create your account</h1>
    <p className="mt-2 text-sm text-brand-mist/70">Join creators you love, or start building your own community.</p>
    <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
      {accountTypes.map((option) => <button key={option.value} className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${form.role === option.value ? "bg-brand-primary" : "text-brand-mist/60"}`} disabled={submitting} onClick={() => setForm((value) => ({ ...value, role: option.value }))} type="button">{option.label}</button>)}
    </div>
    {fieldErrors.role ? <p className="mt-2 text-xs text-red-300">{fieldErrors.role}</p> : null}
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div>
        <Input aria-describedby={fieldErrors.name ? "register-name-error" : undefined} aria-invalid={Boolean(fieldErrors.name)} autoComplete="name" disabled={submitting} label="Name" name="name" onChange={update} required value={form.name} />
        {fieldErrors.name ? <p className="mt-2 text-xs text-red-300" id="register-name-error">{fieldErrors.name}</p> : null}
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-brand-mist/80">Username</span>
        <div className={`flex overflow-hidden rounded-2xl border bg-white/5 transition ${usernameBorder}`}>
          <span className="flex items-center border-r border-white/10 bg-white/[0.04] px-4 font-bold text-brand-primary">@</span>
          <input aria-describedby="username-status" aria-invalid={Boolean(fieldErrors.username)} autoComplete="username" className="dark-auth-input min-w-0 flex-1 bg-transparent px-3 py-3 text-white outline-none placeholder:text-brand-mist/30" disabled={submitting} maxLength={30} name="username" onChange={updateUsername} placeholder="yourname" required spellCheck="false" value={form.username} />
          <span className="flex w-11 items-center justify-center">{usernameState.status === "checking" && <FiLoader className="animate-spin text-brand-mist/60" />}{usernameState.status === "available" && <FiCheckCircle className="text-emerald-400" />}{usernameState.status === "unavailable" && <FiXCircle className="text-red-400" />}</span>
        </div>
        <p className={`flex items-center gap-1.5 text-xs ${usernameState.status === "available" ? "text-emerald-400" : usernameState.status === "unavailable" || fieldErrors.username ? "text-red-400" : "text-brand-mist/45"}`} id="username-status">{fieldErrors.username || usernameState.message}</p>
      </label>
      <div>
        <Input aria-describedby={fieldErrors.email ? "register-email-error" : undefined} aria-invalid={Boolean(fieldErrors.email)} autoComplete="email" disabled={submitting} label="Email" name="email" onChange={update} required type="email" value={form.email} />
        {fieldErrors.email ? <p className="mt-2 text-xs text-red-300" id="register-email-error">{fieldErrors.email}</p> : null}
      </div>
      <PasswordField disabled={submitting} error={fieldErrors.password} label="Password" name="password" onChange={update} onToggle={() => setVisible((value) => ({ ...value, password: !value.password }))} value={form.password} visible={visible.password} />
      <PasswordField disabled={submitting} error={fieldErrors.confirmPassword} label="Confirm password" name="confirmPassword" onChange={update} onToggle={() => setVisible((value) => ({ ...value, confirmPassword: !value.confirmPassword }))} value={form.confirmPassword} visible={visible.confirmPassword} />
      <p className="text-xs text-brand-mist/45">Use at least 8 characters with uppercase, lowercase, and number characters.</p>
      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-brand-mist/70">
        <input checked={form.termsAccepted} className="mt-1 accent-brand-primary" disabled={submitting} name="termsAccepted" onChange={update} required type="checkbox" />
        <span>I agree to the Atseen terms and privacy policy.</span>
      </label>
      {fieldErrors.termsAccepted ? <p className="text-xs text-red-300">{fieldErrors.termsAccepted}</p> : null}
      {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p> : null}
      <Button className="w-full disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700" disabled={submitting || usernameState.status === "checking"} type="submit">{submitting ? "Creating account..." : form.role === "creator" ? "Create creator account" : "Create fan account"}</Button>
    </form>
    <p className="mt-6 text-center text-sm text-brand-mist/70">Already have an account? <Link className="font-semibold text-brand-secondary" to="/login">Sign in</Link></p>
  </div>;
}

export default RegisterPage;
