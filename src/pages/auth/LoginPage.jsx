import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { defaultDestinationFor, destinationForUser, isOnboardingComplete, onboardingPathFor } from "../../utils/socialAccess";
import { isEmail } from "../../utils/validators";
import { fallbackMessages, normalizeApiError } from "../../utils/apiErrors";

const destinationAfterLogin = (user, fromPath) => {
  if (!isOnboardingComplete(user)) return onboardingPathFor(user);
  const defaultDestination = defaultDestinationFor(user.role);
  const roleRoute = fromPath?.match(/^\/(admin|creator|fan)(?:\/|$)/)?.[1];

  if (
    !fromPath
    || fromPath === "/login"
    || fromPath.startsWith("/settings")
    || (roleRoute === "admin" && user.role !== "admin")
    || (roleRoute === "creator" && user.role !== "creator")
    || (roleRoute === "fan" && user.role !== "fan")
  ) {
    return defaultDestination;
  }

  return fromPath;
};

function LoginPage() {
  const { loading, login, user: authenticatedUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = ({ target }) => {
    setForm((value) => ({ ...value, [target.name]: target.value }));
    setFieldErrors((value) => ({ ...value, [target.name]: "" }));
    setError("");
  };

  const validate = () => {
    const nextErrors = {};
    const email = form.email.trim();

    if (!email) nextErrors.email = "Please enter your email address.";
    else if (!isEmail(email)) nextErrors.email = "Please enter a valid email address.";
    if (!form.password) nextErrors.password = "Please enter your password.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitting(true);

    try {
      const response = await login({ email: form.email.trim().toLowerCase(), password: form.password });
      const user = response.data.data.user;
      navigate(destinationAfterLogin(user, location.state?.from?.pathname), { replace: true });
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, fallbackMessages.server);
      setFieldErrors(normalized.errors || {});
      setError(normalized.status === 401 ? fallbackMessages.credentials : normalized.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && authenticatedUser) {
    return <Navigate replace to={destinationForUser(authenticatedUser)} />;
  }

  return (
    <div>
      <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/">
        Back to creators
      </Link>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-brand-mist/70">
        One secure login for fans, creators, and admins. We will take you to the right place.
      </p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <div>
          <Input
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            disabled={submitting}
            label="Email"
            name="email"
            onChange={update}
            required
            type="email"
            value={form.email}
          />
          {fieldErrors.email ? <p className="mt-2 text-xs text-red-300" id="login-email-error">{fieldErrors.email}</p> : null}
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-brand-mist/80">Password</span>
          <span className="flex rounded-2xl border border-white/10 bg-white/5 focus-within:border-brand-primary">
            <input
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              aria-invalid={Boolean(fieldErrors.password)}
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/40"
              disabled={submitting}
              name="password"
              onChange={update}
              required
              type={passwordVisible ? "text" : "password"}
              value={form.password}
            />
            <button
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              className="grid w-12 place-items-center text-brand-mist/70 transition hover:text-white disabled:opacity-50"
              disabled={submitting}
              onClick={() => setPasswordVisible((value) => !value)}
              type="button"
            >
              {passwordVisible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
            </button>
          </span>
          {fieldErrors.password ? <p className="text-xs text-red-300" id="login-password-error">{fieldErrors.password}</p> : null}
        </label>
        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p> : null}
        <Button className="w-full disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-brand-mist/70">
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/register">Create account</Link>
      </div>
    </div>
  );
}

export default LoginPage;
