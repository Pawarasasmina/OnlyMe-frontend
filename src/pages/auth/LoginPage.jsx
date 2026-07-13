import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { demoAccounts } from "../../data/demoAccounts";
import { useAuth } from "../../hooks/useAuth";

const destinationFor = (role) =>
  role === "creator" ? "/creator/studio" : role === "admin" ? "/admin/dashboard" : "/fan/dashboard";

const destinationAfterLogin = (user, fromPath, accessToken) => {
  const defaultDestination = destinationFor(user.role);

  if (accessToken?.startsWith("demo-token")) {
    return defaultDestination;
  }

  if (!fromPath || fromPath === "/login" || fromPath.startsWith("/settings")) {
    return defaultDestination;
  }

  return fromPath;
};

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = ({ target }) => setForm((value) => ({ ...value, [target.name]: target.value }));
  const fillDemoAccount = (account) => {
    setError("");
    setForm({ email: account.email, password: account.password });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await login(form);
      const user = response.data.data.user;
      navigate(destinationAfterLogin(user, location.state?.from?.pathname, response.data.data.accessToken), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/">
        Back to creators
      </Link>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-brand-mist/70">
        One login for fans and creators. We will take you to the right place.
      </p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <Input autoComplete="email" label="Email" name="email" onChange={update} required type="email" value={form.email} />
        <Input
          autoComplete="current-password"
          label="Password"
          minLength={8}
          name="password"
          onChange={update}
          required
          type="password"
          value={form.password}
        />
        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        <Button className="w-full disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {demoAccounts.map((account) => (
          <button
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-brand-mist/75 transition hover:border-brand-secondary/60 hover:text-white"
            key={account.email}
            onClick={() => fillDemoAccount(account)}
            type="button"
          >
            Use {account.label} Login
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-between text-sm text-brand-mist/70">
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/register">Create fan account</Link>
      </div>
      <Link className="mt-4 block text-center text-sm font-semibold text-brand-secondary" to="/register?role=creator">
        Want to become a creator?
      </Link>
    </div>
  );
}

export default LoginPage;
