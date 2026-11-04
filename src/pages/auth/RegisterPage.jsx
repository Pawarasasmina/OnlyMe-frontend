import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiCheckCircle, FiLoader, FiXCircle } from "react-icons/fi";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";

function RegisterPage() {
  const { language } = __useUiLanguage();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", dateOfBirth: "" });
  const [usernameState, setUsernameState] = useState(() => ({ status: "idle", message: __msg("auth.chooseYourUniqueUsername") }));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const username = form.username.trim();
    if (!username) {
      setUsernameState({ status: "idle", message: __msg("auth.chooseYourUniqueUsername") });
      return undefined;
    }
    if (username.length > 30) {
      setUsernameState({ status: "unavailable", message: __msg("auth.usernameMustBe30CharactersOrLess") });
      return undefined;
    }
    if (!/^[a-z0-9_.]+$/.test(username)) {
      setUsernameState({ status: "unavailable", message: __msg("auth.useLowercaseLettersNumbersUnderscoresOrPeriods") });
      return undefined;
    }

    let active = true;
    setUsernameState({ status: "checking", message: __msg("auth.checkingAvailability") });
    const timeout = window.setTimeout(() => {
      profileService.checkUsername(username)
        .then((response) => {
          if (!active) return;
          setUsernameState(response.data.data.available
            ? { status: "available", message: __msg("auth.value0IsAvailable", { value0: username }) }
            : { status: "unavailable", message: __msg("auth.value0IsAlreadyTaken", { value0: username }) });
        })
        .catch((requestError) => {
          if (!active) return;
          setUsernameState({ status: "unavailable", message: requestError.response?.data?.message || __msg("auth.unableToCheckThisUsername") });
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
      setError(__msg("auth.pleaseChooseAnAvailableUsernameBeforeCreatingYourAccount"));
      return;
    }
    setSubmitting(true);
    try {
      const { firstName, lastName, ...account } = form;
      await register({ ...account, name: `${firstName} ${lastName}`.trim(), preferredLanguage: language, referralCode: searchParams.get("ref") || undefined, referralShareIdentity: searchParams.get("private") !== "1" });
      navigate("/seen", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || __msg("auth.unableToCreateYourAccountPleaseTryAgain"));
    } finally {
      setSubmitting(false);
    }
  };

  const usernameBorder = usernameState.status === "available" ? "border-emerald-400 ring-1 ring-emerald-400/20" : usernameState.status === "unavailable" ? "border-red-400 ring-1 ring-red-400/20" : "border-white/10 focus-within:border-brand-primary";

  return <div>
    <Link className="mb-8 inline-block text-sm text-brand-mist/60" to="/">{__msg("auth.backToCreators_447886")}</Link>
    <h1 className="text-3xl font-bold">{__msg("auth.createYourAccount")}</h1>
    <p className="mt-2 text-sm text-brand-mist/70">{__msg("auth.discoverPeopleAndStoriesYouLoveYouCanApply")}</p>
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <Input autoComplete="given-name" label="First name" name="firstName" onChange={update} required value={form.firstName} />
        <Input autoComplete="family-name" label="Last name" name="lastName" onChange={update} required value={form.lastName} />
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-brand-mist/80">{__msg("auth.username")}</span>
        <div className={`flex overflow-hidden rounded-2xl border bg-white/5 transition ${usernameBorder}`}>
          <span className="flex items-center border-r border-white/10 bg-white/[0.04] px-4 font-bold text-brand-primary">@</span>
          <input aria-describedby="username-status" autoComplete="username" className="dark-auth-input min-w-0 flex-1 bg-transparent px-3 py-3 text-white outline-none placeholder:text-brand-mist/30" maxLength={30} name="username" onChange={updateUsername} placeholder={__msg("auth.yourname")} required spellCheck="false" value={form.username} />
          <span className="flex w-11 items-center justify-center">{usernameState.status === "checking" && <FiLoader className="animate-spin text-brand-mist/60" />}{usernameState.status === "available" && <FiCheckCircle className="text-emerald-400" />}{usernameState.status === "unavailable" && <FiXCircle className="text-red-400" />}</span>
        </div>
        <p className={`flex items-center gap-1.5 text-xs ${usernameState.status === "available" ? "text-emerald-400" : usernameState.status === "unavailable" ? "text-red-400" : "text-brand-mist/45"}`} id="username-status">{__systemMessage(usernameState.message)}</p>
      </label>
      <Input autoComplete="email" label={__msg("auth.email")} name="email" onChange={update} required type="email" value={form.email} />
      <Input autoComplete="new-password" label={__msg("auth.password")} minLength={8} name="password" onChange={update} required type="password" value={form.password} />
      <Input autoComplete="bday" label="Birthday" max={new Date().toISOString().slice(0, 10)} name="dateOfBirth" onChange={update} required type="date" value={form.dateOfBirth} />
      {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{__systemMessage(error)}</p> : null}
      <Button className="w-full disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700" disabled={submitting || usernameState.status !== "available"} type="submit">{submitting ? __msg("auth.creatingAccount") : __msg("auth.createAccount")}</Button>
    </form>
    <p className="mt-6 text-center text-sm text-brand-mist/70">{__msg("auth.alreadyHaveAnAccount")} <Link className="font-semibold text-brand-secondary" to="/login">{__msg("layout.signIn")}</Link></p>
  </div>;
}

export default RegisterPage;
