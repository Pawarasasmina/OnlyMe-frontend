import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { defaultDestinationFor } from "../../utils/socialAccess";

const destinationAfterLogin = (user, fromPath) => {
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
  __useUiLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = ({ target }) => setForm((value) => ({ ...value, [target.name]: target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await login(form);
      const user = response.data.data.user;
      navigate(destinationAfterLogin(user, location.state?.from?.pathname), { replace: true });
    } catch (requestError) {
      const status = requestError.response?.status;
      setError(status === 429
        ? __msg("auth.tooManySignInAttemptsPleaseWaitA")
        : [502, 503, 504].includes(status)
          ? __msg("auth.theServiceIsTemporarilyUnavailablePleaseTryAgain")
          : !requestError.response
            ? __msg("auth.unableToReachTheServerCheckYourConnection")
            : requestError.response.data?.message || __msg("auth.unableToSignInPleaseTryAgain"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/">{__msg("auth.backToCreators")}</Link>
      <h1 className="text-3xl font-bold">{__msg("auth.welcomeBack")}</h1>
      <p className="mt-2 text-sm text-brand-mist/70">{__msg("auth.oneSecureLoginForFansCreatorsAndAdminsWe")}</p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <Input autoComplete="email" label={__msg("auth.email")} name="email" onChange={update} required type="email" value={form.email} />
        <Input
          autoComplete="current-password"
          label={__msg("auth.password")}
          minLength={8}
          name="password"
          onChange={update}
          required
          type="password"
          value={form.password}
        />
        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{__systemMessage(error)}</p> : null}
        <Button className="w-full disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? __msg("auth.signingIn") : __msg("layout.signIn")}
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-brand-mist/70">
        <Link to="/forgot-password">{__msg("auth.forgotPassword")}</Link>
        <Link to="/register">{__msg("auth.createAccount")}</Link>
      </div>
    </div>
  );
}

export default LoginPage;


