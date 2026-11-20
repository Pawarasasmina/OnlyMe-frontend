import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { onboardingService } from "../../services/onboardingService";
import { clearPreAuthInterests, readPreAuthInterests } from "../../utils/preAuthOnboarding";
import { profileService } from "../../services/profileService";
import { normalizeUsernameInput, usernameFromName, usernameSuggestions, usernameValidationError } from "../../utils/username";
import beachVideo from "../../assets/videos/beach.mp4";
import cityVideo from "../../assets/videos/city.mp4";
import coffeeVideo from "../../assets/videos/coffee.mp4";
import fashionVideo from "../../assets/videos/fashion.mp4";
import foodVideo from "../../assets/videos/food.mp4";
import gymVideo from "../../assets/videos/gym.mp4";

export default function RegisterPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const { register } = useAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", identifier: "", password: "", dateOfBirth: "" });
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [usernameState, setUsernameState] = useState({ status: "idle", message: "" });
  const [availableSuggestions, setAvailableSuggestions] = useState([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const birthdayPicker = useRef(null);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (usernameEdited) return;
    set("username", usernameFromName(form.firstName, form.lastName));
  }, [form.firstName, form.lastName, usernameEdited]);
  useEffect(() => {
    const username = form.username;
    const validationError = usernameValidationError(username);
    if (!username) { setUsernameState({ status: "idle", message: "" }); setAvailableSuggestions([]); return undefined; }
    if (validationError) { setUsernameState({ status: "error", message: validationError }); setAvailableSuggestions([]); return undefined; }
    setUsernameState({ status: "checking", message: "" });
    setAvailableSuggestions([]);
    const timer = window.setTimeout(async () => {
      try {
        const result = await profileService.checkUsername(username);
        if (result.data?.data?.available) {
          setUsernameState({ status: "available", message: `✓ atseen.com/${username}` });
        } else {
          setUsernameState({ status: "error", message: "This username is taken" });
          setSuggestionsBusy(true);
          const candidates = usernameSuggestions(form.firstName, form.lastName).filter(candidate => candidate !== username);
          const checks = await Promise.all(candidates.map(async candidate => {
            try { return (await profileService.checkUsername(candidate)).data?.data?.available ? candidate : null; }
            catch { return null; }
          }));
          setAvailableSuggestions(checks.filter(Boolean).slice(0, 5));
          setSuggestionsBusy(false);
        }
      } catch (requestError) {
        setUsernameState({ status: "error", message: requestError.response?.data?.message || "Could not check this username" });
        setSuggestionsBusy(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form.firstName, form.lastName, form.username]);
  const setBirthday = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join(".");
    set("dateOfBirth", formatted);
  };
  const selectBirthday = (isoDate) => {
    if (!isoDate) return;
    const [year, month, day] = isoDate.split("-");
    set("dateOfBirth", `${day}.${month}.${year}`);
  };
  const openBirthdayPicker = () => {
    const picker = birthdayPicker.current;
    if (!picker) return;
    if (picker.showPicker) picker.showPicker();
    else picker.click();
  };
  const submit = async (event) => {
    event.preventDefault(); setError("");
    const birthdayMatch = form.dateOfBirth.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!birthdayMatch) return setError(__msg("system.RegisterPage.585565c114"));
    const [, day, month, year] = birthdayMatch;
    const dateOfBirth = `${year}-${month}-${day}`;
    const parsedBirthday = new Date(`${dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(parsedBirthday.getTime()) || parsedBirthday.getUTCDate() !== Number(day) || parsedBirthday.getUTCMonth() + 1 !== Number(month) || parsedBirthday.getUTCFullYear() !== Number(year) || parsedBirthday > new Date()) return setError(__msg("system.RegisterPage.ee46b7d1cf"));
    const adultCutoff = new Date(); adultCutoff.setUTCFullYear(adultCutoff.getUTCFullYear() - 18);
    if (parsedBirthday > adultCutoff) return setError(__msg("settings.minimumAgeRequired"));
    setSubmitting(true);
    try {
      const usernameError = usernameValidationError(form.username);
      if (usernameError || usernameState.status !== "available") throw new Error(usernameError || "Choose an available username");
      await register({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), name: `${form.firstName} ${form.lastName}`.trim(), username: form.username, identifier: form.identifier.trim(), password: form.password, dateOfBirth, preferredLanguage: language, referralCode: searchParams.get("ref") || undefined, referralShareIdentity: searchParams.get("private") !== "1" });
      await onboardingService.saveWelcomeStep();
      const interests = readPreAuthInterests();
      if (interests.length >= 3) {
        await onboardingService.saveInterests(interests);
        clearPreAuthInterests();
        navigate("/onboarding/account-type", { replace: true });
      } else navigate("/onboarding/interests", { replace: true });
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message || __msg("auth.unableToCreateYourAccount")); }
    finally { setSubmitting(false); }
  };

  const interests = readPreAuthInterests();
  const topicPreview = { Travel: cityVideo, Fitness: gymVideo, Food: foodVideo, Fashion: fashionVideo, Lifestyle: coffeeVideo, Business: cityVideo, Technology: cityVideo, Psychology: beachVideo, Beauty: fashionVideo, Wellness: beachVideo };
  const field = "w-full rounded-[14px] border border-white/10 bg-[#11151B] px-4 py-[15px] text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#9CCBFF]/60";
  return <main className="min-h-[100dvh] w-full bg-[#05080B] px-[21px] pb-[max(34px,env(safe-area-inset-bottom))] pt-[max(21px,env(safe-area-inset-top))] text-white">
    <div className="mx-auto w-full max-w-[445px]">
    <header className="flex items-center gap-3"><Link aria-label={__msg("system.RegisterPage.5c41359861")} className="grid h-10 w-10 place-items-center rounded-full bg-white/[.07] text-white/80 active:scale-[.97]" to="/start/interests"><FiArrowLeft /></Link><h1 className="text-[20px] font-black tracking-[-.02em]">{__msg("auth.createAccount")}</h1></header>
    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full w-[80%] rounded-full bg-[#91C7FF]" /></div>
    <section className="mt-3.5 flex min-h-[59px] items-center rounded-[15px] border border-[#9CCBFF]/25 bg-[#111820] px-3">
      <div className="mr-3 flex -space-x-2">{interests.slice(0, 3).map((topic, index) => <span className="block h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-[#111820] bg-[#24364E]" key={topic} style={{ zIndex: 3 - index }}><video autoPlay className="h-full w-full object-cover" loop muted playsInline preload="metadata" src={topicPreview[topic] || cityVideo} /></span>)}</div>
      <div className="min-w-0"><b className="block truncate text-[13px]">{interests.slice(0, 3).join(" · ")}</b><p className="mt-0.5 text-[12px] text-white/65">{__msg("system.RegisterPage.7ed3e7f8e7")}</p></div>
    </section>
    <p className="mt-2 text-[14px] text-white/85">{__msg("system.RegisterPage.8c1f824b62")}</p>
    <form className="mt-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3"><input autoComplete="given-name" autoFocus className={field} maxLength={30} onChange={(event) => set("firstName", event.target.value)} placeholder={__msg("settings.firstName")} required value={form.firstName} /><input autoComplete="family-name" className={field} maxLength={30} onChange={(event) => set("lastName", event.target.value)} placeholder={__msg("settings.lastName")} value={form.lastName} /></div>
      <label className="relative mt-3 block"><span className="pointer-events-none absolute left-4 top-[15px] font-black text-[#9CCBFF]">@</span><input aria-describedby="register-username-hint" autoCapitalize="none" autoComplete="username" className={`${field} pl-8`} onChange={(event) => { setUsernameEdited(true); set("username", normalizeUsernameInput(event.target.value)); }} placeholder="username" required spellCheck={false} value={form.username} /></label>
      <p className={`mt-1.5 min-h-4 px-1 text-[11px] ${usernameState.status === "available" ? "text-[#6ECF97]" : usernameState.status === "error" ? "text-red-300" : "text-white/40"}`} id="register-username-hint">{usernameState.status === "checking" ? "Checking…" : usernameState.message}</p>
      {usernameState.status === "error" && (suggestionsBusy || availableSuggestions.length) ? <section className="mt-2 rounded-[14px] border border-white/10 bg-white/[.035] p-3"><p className="text-[11px] font-bold text-white/50">{suggestionsBusy ? __msg("auth.checkingAvailability") : __msg("auth.usernameSuggestions")}</p>{availableSuggestions.length ? <div className="mt-2 flex flex-wrap gap-2">{availableSuggestions.map(suggestion => <button className="rounded-full border border-[#9CCBFF]/25 bg-[#9CCBFF]/10 px-3 py-2 text-[12px] font-bold text-[#9CCBFF] transition hover:border-[#9CCBFF]/55 hover:bg-[#9CCBFF]/15 active:scale-95" key={suggestion} onClick={() => { setUsernameEdited(true); set("username", suggestion); setAvailableSuggestions([]); }} type="button">@{suggestion}</button>)}</div> : null}</section> : null}
      <input autoCapitalize="none" autoComplete="email" className={`${field} mt-3`} onChange={(event) => set("identifier", event.target.value)} placeholder={__msg("auth.emailOrPhone")} required spellCheck={false} type="text" value={form.identifier} />
      <input autoComplete="new-password" className={`${field} mt-3`} minLength={8} onChange={(event) => set("password", event.target.value)} placeholder={__msg("system.RegisterPage.9a691d13cd")} required type="password" value={form.password} />
      <div className="relative mt-3"><input aria-label={__msg("system.RegisterPage.a6b9d69f57")} autoComplete="bday" className={`${field} pr-12`} inputMode="numeric" maxLength={10} onChange={(event) => setBirthday(event.target.value)} placeholder={__msg("system.RegisterPage.954f4a0fe7")} required value={form.dateOfBirth} /><input aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" max={new Date().toISOString().slice(0, 10)} onChange={(event) => selectBirthday(event.target.value)} ref={birthdayPicker} tabIndex={-1} type="date" /><button aria-label={__msg("system.RegisterPage.560ffcf959")} className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-lg text-white/45 transition hover:bg-white/[.06] hover:text-[#9CCBFF] active:scale-95" onClick={openBirthdayPicker} type="button"><FiCalendar /></button></div>
      <p className="mt-4 text-[10.5px] leading-[1.6] text-white/45">{__msg("system.RegisterPage.6aed4e7f25")} <span className="text-[#9CCBFF]">{__msg("system.RegisterPage.0c8a9a95e2")}</span> {__msg("fan.and")} <span className="text-[#9CCBFF]">{__msg("system.RegisterPage.9db108ba6b")}</span>{__msg("system.RegisterPage.c058e897f3")}</p>
      {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{__systemMessage(error)}</p> : null}
      <button className="mt-5 w-full rounded-[14px] bg-[#9CCBFF] py-4 text-[15px] font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-45" disabled={submitting} type="submit">{submitting ? __msg("system.RegisterPage.baab5b8cbb") : __msg("auth.createAccount")}</button>
    </form>
    </div>
  </main>;
}
