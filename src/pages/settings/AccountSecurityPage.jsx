/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { FiArrowLeft, FiLock } from "react-icons/fi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { profileService } from "../../services/profileService";

function AccountSecurityPage() {
  __useUiLanguage();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const mutation = useMutation({ mutationFn: (payload) => profileService.changePassword(payload), onSuccess: () => { setForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setMessage(__msg("creator.passwordChangedSuccessfully")); }, onError: (error) => setMessage(error.response?.data?.message || __msg("settings.unableToChangePassword")) });
  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }));
  const submit = (event) => { event.preventDefault(); setMessage(""); if (form.newPassword.length < 8) return setMessage(__msg("creator.newPasswordMustBeAtLeast8Characters")); if (form.newPassword !== form.confirmPassword) return setMessage(__msg("creator.newPasswordsDoNotMatch")); mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword }); };
  return <div className="mx-auto max-w-2xl"><Link className="inline-flex items-center gap-2 text-sm text-atseen-muted hover:text-atseen-blue" to="/settings"><FiArrowLeft data-ui-directional="true" /> {__msg("profile.settings")}</Link><div className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-atseen-blue">{__msg("creator.security")}</p><h1 className="mt-1 text-2xl font-black">{__msg("admin.changePassword")}</h1><p className="mt-2 text-sm text-atseen-muted">{__msg("creator.useAUniquePasswordYouDoNotUseOn")}</p></div><form className="mt-7 space-y-5 rounded-2xl border border-atseen-line bg-atseen-surface p-5 sm:p-7" onSubmit={submit}><div className="flex items-center gap-3 border-b border-atseen-line pb-5"><span className="rounded-xl bg-atseen-blue/10 p-3 text-atseen-blue"><FiLock /></span><p className="font-bold">{__msg("creator.passwordProtection")}</p></div>{message ? <p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-atseen-muted">{message}</p> : null}<Input autoComplete="current-password" label={__msg("admin.currentPassword")} name="currentPassword" onChange={update} required type="password" value={form.currentPassword} /><Input autoComplete="new-password" label={__msg("admin.newPassword")} name="newPassword" onChange={update} required type="password" value={form.newPassword} /><Input autoComplete="new-password" label={__msg("admin.confirmNewPassword")} name="confirmPassword" onChange={update} required type="password" value={form.confirmPassword} /><div className="flex justify-end"><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? __msg("admin.changing") : __msg("admin.changePassword")}</Button></div></form></div>;
}

export default AccountSecurityPage;
