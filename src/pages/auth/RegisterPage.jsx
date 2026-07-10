import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", role: searchParams.get("role") === "creator" ? "creator" : "fan" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = ({ target }) => setForm((value) => ({ ...value, [target.name]: target.value }));

  const submit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await register({ ...form, username: form.username.replace(/^@/, "") });
      navigate(response.data.data.user.role === "creator" ? "/creator/studio" : "/", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create your account. Please try again.");
    } finally { setSubmitting(false); }
  };

  return <div>
    <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/">← Back to creators</Link>
    <h1 className="text-3xl font-bold">Create your account</h1>
    <p className="mt-2 text-sm text-brand-mist/70">Join creators you love, or start building your own community.</p>
    <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
      {[{ value: "fan", label: "Join as a fan" }, { value: "creator", label: "Become a creator" }].map((option) => <button key={option.value} className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${form.role === option.value ? "bg-brand-primary" : "text-brand-mist/60"}`} onClick={() => setForm((value) => ({ ...value, role: option.value }))} type="button">{option.label}</button>)}
    </div>
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <Input autoComplete="name" label="Name" name="name" onChange={update} required value={form.name} />
      <Input autoComplete="username" label="Username" name="username" onChange={update} pattern="^@?[a-zA-Z0-9._-]+$" placeholder="@handle" required value={form.username} />
      <Input autoComplete="email" label="Email" name="email" onChange={update} required type="email" value={form.email} />
      <Input autoComplete="new-password" label="Password" minLength={8} name="password" onChange={update} required type="password" value={form.password} />
      {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
      <Button className="w-full disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "Creating account..." : form.role === "creator" ? "Create creator account" : "Create fan account"}</Button>
    </form>
    <p className="mt-6 text-center text-sm text-brand-mist/70">Already have an account? <Link className="font-semibold text-brand-secondary" to="/login">Sign in</Link></p>
  </div>;
}

export default RegisterPage;
