import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiCheckCircle, FiLoader, FiXCircle } from "react-icons/fi";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", role: searchParams.get("role") === "creator" ? "creator" : "fan" });
  const [usernameState, setUsernameState] = useState({ status: "idle", message: "Choose your unique username" });
  const [error, setError] = useState("");
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
          setUsernameState({ status: "unavailable", message: requestError.response?.data?.message || "Unable to check this username" });
        });
    }, 450);

    return () => { active = false; window.clearTimeout(timeout); };
  }, [form.username]);

  const update = ({ target }) => setForm((value) => ({ ...value, [target.name]: target.value }));
  const updateUsername = ({ target }) => {
    const username = target.value.replace(/^@+/, "").toLowerCase().replace(/\s/g, "");
    setForm((value) => ({ ...value, username }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (usernameState.status !== "available") {
      setError("Please choose an available username before creating your account.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await register(form);
      navigate(response.data.data.user.role === "creator" ? "/creator/dashboard" : "/", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const usernameBorder = usernameState.status === "available" ? "border-emerald-400 ring-1 ring-emerald-400/20" : usernameState.status === "unavailable" ? "border-red-400 ring-1 ring-red-400/20" : "border-white/10 focus-within:border-brand-primary";

  return <div>
    <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/">← Back to creators</Link>
    <h1 className="text-3xl font-bold">Create your account</h1>
    <p className="mt-2 text-sm text-brand-mist/70">Join creators you love, or start building your own community.</p>
    <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
      {[{ value: "fan", label: "Join as a fan" }, { value: "creator", label: "Become a creator" }].map((option) => <button key={option.value} className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${form.role === option.value ? "bg-brand-primary" : "text-brand-mist/60"}`} onClick={() => setForm((value) => ({ ...value, role: option.value }))} type="button">{option.label}</button>)}
    </div>
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <Input autoComplete="name" label="Name" name="name" onChange={update} required value={form.name} />
      <label className="block space-y-2">
        <span className="text-sm text-brand-mist/80">Username</span>
        <div className={`flex overflow-hidden rounded-2xl border bg-white/5 transition ${usernameBorder}`}>
          <span className="flex items-center border-r border-white/10 bg-white/[0.04] px-4 font-bold text-brand-primary">@</span>
          <input aria-describedby="username-status" autoComplete="username" className="dark-auth-input min-w-0 flex-1 bg-transparent px-3 py-3 text-white outline-none placeholder:text-brand-mist/30" maxLength={30} name="username" onChange={updateUsername} placeholder="yourname" required spellCheck="false" value={form.username} />
          <span className="flex w-11 items-center justify-center">{usernameState.status === "checking" && <FiLoader className="animate-spin text-brand-mist/60" />}{usernameState.status === "available" && <FiCheckCircle className="text-emerald-400" />}{usernameState.status === "unavailable" && <FiXCircle className="text-red-400" />}</span>
        </div>
        <p className={`flex items-center gap-1.5 text-xs ${usernameState.status === "available" ? "text-emerald-400" : usernameState.status === "unavailable" ? "text-red-400" : "text-brand-mist/45"}`} id="username-status">{usernameState.message}</p>
      </label>
      <Input autoComplete="email" label="Email" name="email" onChange={update} required type="email" value={form.email} />
      <Input autoComplete="new-password" label="Password" minLength={8} name="password" onChange={update} required type="password" value={form.password} />
      {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      <Button className="w-full disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700" disabled={submitting || usernameState.status !== "available"} type="submit">{submitting ? "Creating account..." : form.role === "creator" ? "Create creator account" : "Create fan account"}</Button>
    </form>
    <p className="mt-6 text-center text-sm text-brand-mist/70">Already have an account? <Link className="font-semibold text-brand-secondary" to="/login">Sign in</Link></p>
  </div>;
}

export default RegisterPage;

