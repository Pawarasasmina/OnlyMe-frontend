import { useState } from "react";
import { Link } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { authService } from "../../services/authService";
import { isEmail } from "../../utils/validators";
import { normalizeApiError } from "../../utils/apiErrors";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    if (!isEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await authService.forgotPassword(normalizedEmail);
      setSuccess(response.data.message || "If an account exists, password reset instructions have been sent.");
    } catch (requestError) {
      setError(normalizeApiError(requestError, "Unable to send reset instructions. Please try again.").message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/login">
        Back to sign in
      </Link>
      <h1 className="text-3xl font-bold">Reset password</h1>
      <p className="mt-2 text-sm text-brand-mist/70">
        Enter your account email and we will send a secure password reset link.
      </p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <Input
          autoComplete="email"
          disabled={submitting}
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p> : null}
        {success ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300" role="status">{success}</p> : null}
        <Button className="w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;
