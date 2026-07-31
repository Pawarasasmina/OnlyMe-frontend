import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Button from "../../components/common/Button";
import { authService } from "../../services/authService";
import { isStrongPassword } from "../../utils/validators";
import { normalizeApiError } from "../../utils/apiErrors";

function PasswordField({ label, name, value, visible, disabled, onChange, onToggle }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-brand-mist/80">{label}</span>
      <span className="flex rounded-2xl border border-white/10 bg-white/5 focus-within:border-brand-primary">
        <input
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
    </label>
  );
}

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTimer = useRef(null);
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [visible, setVisible] = useState({ newPassword: false, confirmPassword: false });
  const [error, setError] = useState(token ? "" : "Reset token is missing. Please request a new reset link.");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => {
    if (redirectTimer.current) {
      window.clearTimeout(redirectTimer.current);
    }
  }, []);

  const update = ({ target }) => {
    setForm((value) => ({ ...value, [target.name]: target.value }));
  };

  const toggleVisible = (name) => {
    setVisible((value) => ({ ...value, [name]: !value[name] }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Reset token is missing. Please request a new reset link.");
      return;
    }

    if (!form.newPassword) {
      setError("Password is required.");
      return;
    }

    if (!isStrongPassword(form.newPassword)) {
      setError("Password must include at least 8 characters, uppercase, lowercase, and a number.");
      return;
    }

    if (!form.confirmPassword) {
      setError("Confirm password is required.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await authService.resetPassword(token, form.newPassword, form.confirmPassword);
      setSuccess(response.data.message || "Password reset successful. Redirecting to sign in...");
      setForm({ newPassword: "", confirmPassword: "" });
      redirectTimer.current = window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2200);
    } catch (requestError) {
      setError(normalizeApiError(requestError, "Unable to reset password. Please request a new link.").message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/login">
        Back to sign in
      </Link>
      <h1 className="text-3xl font-bold">Create new password</h1>
      <p className="mt-2 text-sm text-brand-mist/70">
        Choose a new password for your OnlyMe account.
      </p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <PasswordField
          disabled={submitting || Boolean(success)}
          label="New password"
          name="newPassword"
          onChange={update}
          onToggle={() => toggleVisible("newPassword")}
          value={form.newPassword}
          visible={visible.newPassword}
        />
        <PasswordField
          disabled={submitting || Boolean(success)}
          label="Confirm password"
          name="confirmPassword"
          onChange={update}
          onToggle={() => toggleVisible("confirmPassword")}
          value={form.confirmPassword}
          visible={visible.confirmPassword}
        />
        <p className="text-xs text-brand-mist/45">Use at least 8 characters with uppercase, lowercase, and number characters.</p>
        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p> : null}
        {success ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300" role="status">{success}</p> : null}
        <Button className="w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting || Boolean(success)} type="submit">
          {submitting ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
