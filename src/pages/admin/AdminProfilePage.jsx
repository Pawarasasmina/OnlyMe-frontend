import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiKey, FiLock, FiShield, FiUser } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";

const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500";

function AdminProfilePage() {
  const { setUser, user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [nameMessage, setNameMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const profileQuery = useQuery({ queryKey: ["profile", "me"], queryFn: () => profileService.getMe().then((response) => response.data.data) });
  useEffect(() => { if (profileQuery.data) setName(profileQuery.data.account.displayName || ""); }, [profileQuery.data]);

  const nameMutation = useMutation({
    mutationFn: () => profileService.updateMe({ displayName: name.trim() }),
    onSuccess: (response) => {
      const data = response.data.data;
      queryClient.setQueryData(["profile", "me"], data);
      setUser({ ...user, name: data.account.displayName });
      setNameMessage("Name updated successfully.");
    },
    onError: (error) => setNameMessage(error.response?.data?.message || "Unable to update name."),
  });
  const passwordMutation = useMutation({
    mutationFn: () => profileService.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    onSuccess: () => {
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Password changed successfully.");
    },
    onError: (error) => setPasswordMessage(error.response?.data?.message || "Unable to change password."),
  });

  if (profileQuery.isLoading) return <div className="text-slate-600"><Loader label="Loading admin profile..." /></div>;
  if (profileQuery.isError) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Unable to load your profile.</p>;
  const account = profileQuery.data.account;

  const submitName = (event) => { event.preventDefault(); setNameMessage(""); if (!name.trim()) { setNameMessage("Name is required."); return; } nameMutation.mutate(); };
  const submitPassword = (event) => { event.preventDefault(); setPasswordMessage(""); if (passwords.newPassword.length < 8) { setPasswordMessage("New password must contain at least 8 characters."); return; } if (passwords.newPassword !== passwords.confirmPassword) { setPasswordMessage("New passwords do not match."); return; } passwordMutation.mutate(); };
  const updatePassword = ({ target }) => setPasswords((current) => ({ ...current, [target.name]: target.value }));

  return <div className="mx-auto max-w-5xl"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Account</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Admin profile</h1><p className="mt-1 text-sm text-slate-500">Manage your administrator identity and password.</p></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-2xl font-black text-white">{account.displayName?.slice(0, 1)}</span><h2 className="mt-4 text-xl font-black">{account.displayName}</h2><p className="mt-1 text-sm text-slate-500">@{account.username}</p><div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm"><p className="flex items-center gap-3 text-slate-600"><FiShield className="text-orange-500" /> Administrator</p><p className="flex items-center gap-3 text-slate-600"><FiUser className="text-orange-500" /> {account.email}</p><p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Username and email are permanent account identifiers and cannot be changed.</p></div></aside>
      <div className="space-y-5">
        <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitName}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><FiUser /></span><div><h2 className="font-bold">Personal information</h2><p className="text-xs text-slate-500">Update your displayed administrator name.</p></div></div><label className="mt-5 block text-xs font-bold text-slate-600">Display name<input className={inputClass} maxLength={50} onChange={(event) => setName(event.target.value)} value={name} /></label><div className="mt-4 flex items-center justify-between gap-3">{nameMessage ? <p className={`text-xs font-semibold ${nameMutation.isError ? "text-red-600" : "text-emerald-600"}`}>{nameMessage}</p> : <span />}<button className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50" disabled={nameMutation.isPending || name.trim() === account.displayName} type="submit">{nameMutation.isPending ? "Saving..." : "Save name"}</button></div></form>
        <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitPassword}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><FiKey /></span><div><h2 className="font-bold">Change password</h2><p className="text-xs text-slate-500">Confirm your current password before setting a new one.</p></div></div><div className="mt-5 grid gap-4"><label className="text-xs font-bold text-slate-600">Current password<input autoComplete="current-password" className={inputClass} name="currentPassword" onChange={updatePassword} required type="password" value={passwords.currentPassword} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">New password<input autoComplete="new-password" className={inputClass} minLength={8} name="newPassword" onChange={updatePassword} required type="password" value={passwords.newPassword} /></label><label className="text-xs font-bold text-slate-600">Confirm new password<input autoComplete="new-password" className={inputClass} minLength={8} name="confirmPassword" onChange={updatePassword} required type="password" value={passwords.confirmPassword} /></label></div></div><div className="mt-4 flex items-center justify-between gap-3">{passwordMessage ? <p className={`text-xs font-semibold ${passwordMutation.isError || passwords.newPassword !== passwords.confirmPassword ? "text-red-600" : "text-emerald-600"}`}>{passwordMessage}</p> : <p className="flex items-center gap-1 text-xs text-slate-400"><FiLock /> Minimum 8 characters</p>}<button className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50" disabled={passwordMutation.isPending} type="submit">{passwordMutation.isPending ? "Changing..." : "Change password"}</button></div></form>
      </div>
    </div>
  </div>;
}

export default AdminProfilePage;
