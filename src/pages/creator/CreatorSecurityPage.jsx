import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FiArrowLeft, FiLock } from "react-icons/fi";
import { Link } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { profileService } from "../../services/profileService";

export default function CreatorSecurityPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const mutation = useMutation({ mutationFn: (payload) => profileService.changePassword(payload), onSuccess: () => { setForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setError(""); setSuccess("Password changed successfully."); }, onError: (e) => { setSuccess(""); setError(e.response?.data?.message || "Unable to change password."); } });
  const submit = (event) => { event.preventDefault(); setError(""); if (form.newPassword.length < 8) return setError("New password must be at least 8 characters."); if (form.newPassword !== form.confirmPassword) return setError("New passwords do not match."); mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword }); };
  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }));
  return <div className="mx-auto max-w-2xl"><Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-300" to="/creator/settings"><FiArrowLeft /> Settings</Link><div className="mt-5"><p className="creator-eyebrow">Security</p><h1 className="creator-page-title">Change password</h1><p className="creator-muted mt-2">Use a unique password you do not use on another service.</p></div><form className="creator-card mt-7 space-y-5 p-5 sm:p-7" onSubmit={submit}><div className="flex items-center gap-3 border-b border-white/[0.07] pb-5"><span className="rounded-xl bg-sky-300/10 p-3 text-sky-300"><FiLock /></span><div><p className="font-bold">Password protection</p><p className="text-xs text-slate-500">Your current password is required.</p></div></div>{error ? <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{error}</p> : null}{success ? <p role="status" className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-300">{success}</p> : null}<Input autoComplete="current-password" label="Current password" name="currentPassword" onChange={update} required type="password" value={form.currentPassword} /><Input autoComplete="new-password" label="New password" name="newPassword" onChange={update} required type="password" value={form.newPassword} /><Input autoComplete="new-password" label="Confirm new password" name="confirmPassword" onChange={update} required type="password" value={form.confirmPassword} /><div className="flex justify-end"><Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Changing..." : "Change password"}</Button></div></form></div>;
}
