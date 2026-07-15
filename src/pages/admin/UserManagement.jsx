import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiExternalLink, FiSearch, FiShield, FiUsers } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import AdminVerificationStatusBadge from "../../components/admin/AdminVerificationStatusBadge";
import { adminService } from "../../services/adminService";
import { adminVerificationService } from "../../services/adminVerificationService";
import { useAuth } from "../../hooks/useAuth";

const actionClass = "rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40";

function UserManagement({ fixedRole = null }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const selectedRole = fixedRole || role;
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: () => adminService.getUsers().then((response) => response.data.data.users) });
  const verificationsQuery = useQuery({ queryKey: ["admin", "creator-verification-summaries"], queryFn: adminVerificationService.listAll, enabled: selectedRole !== "fan" });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });
  const statusMutation = useMutation({ mutationFn: ({ userId, status }) => adminService.updateUserStatus(userId, status), onSuccess: refresh });
  const verificationByCreator = useMemo(() => new Map((verificationsQuery.data || []).map((item) => [item.creator?._id, item])), [verificationsQuery.data]);
  const users = useMemo(() => (usersQuery.data || []).filter((user) => { const term = search.toLowerCase(); return (selectedRole === "all" || user.role === selectedRole) && (!term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.username.toLowerCase().includes(term)); }), [search, selectedRole, usersQuery.data]);

  if (usersQuery.isLoading) return <div className="text-slate-600"><Loader label="Loading users..." /></div>;
  if (usersQuery.isError) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Unable to load users.</p>;
  const pageTitle = fixedRole === "fan" ? "Fan management" : fixedRole === "creator" ? "Creator management" : "User management";
  const pageDescription = fixedRole === "fan" ? "Review fan accounts and control their platform access." : fixedRole === "creator" ? "Manage creator accounts and open their separate verification workflow." : "Manage platform account access.";

  return <div className="mx-auto max-w-[1600px]"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Accounts</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{pageTitle}</h1><p className="mt-1 text-sm text-slate-500">{pageDescription}</p></div>
    {statusMutation.isError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{statusMutation.error.response?.data?.message || "Unable to update user"}</p> : null}
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400" onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${fixedRole ? `${fixedRole}s` : "users"}...`} value={search} /></div>{!fixedRole ? <div className="flex gap-2">{["all", "fan", "creator", "admin"].map((item) => <button className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${role === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} key={item} onClick={() => setRole(item)} type="button">{item}</button>)}</div> : null}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th>{fixedRole !== "fan" ? <><th className="px-4 py-3">Creator access</th><th className="px-4 py-3">Verification</th></> : null}<th className="px-4 py-3">Account</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => { const verification = user.role === "creator" ? verificationByCreator.get(user._id) : null; const busy = statusMutation.isPending; return <tr className="hover:bg-slate-50/70" key={user._id}><td className="px-4 py-3"><p className="font-bold text-slate-900">{user.name}</p><p className="mt-0.5 text-xs text-slate-500">@{user.username} · {user.email}</p></td><td className="px-4 py-3 capitalize text-slate-600">{user.role}</td>{fixedRole !== "fan" ? <><td className="px-4 py-3 capitalize text-slate-600">{user.role === "creator" ? user.creatorApprovalStatus || "pending" : "—"}</td><td className="px-4 py-3">{user.role === "creator" ? verification ? <AdminVerificationStatusBadge status={verification.status} /> : verificationsQuery.isLoading ? <span className="text-xs text-slate-400">Loading…</span> : <span className="text-xs text-slate-400">Not available</span> : <span className="text-slate-300">—</span>}</td></> : null}<td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{user.status}</span></td><td className="px-4 py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-4 py-3"><div className="flex justify-end gap-1.5">{user.role === "creator" ? <><a className={`${actionClass} inline-flex items-center gap-1 bg-slate-100 text-slate-600 hover:bg-slate-200`} href={`/creators/${user.username}`} rel="noreferrer" target="_blank">Profile <FiExternalLink /></a><Link className={`${actionClass} inline-flex items-center gap-1 bg-orange-50 text-orange-700 hover:bg-orange-100`} to={verification ? `/admin/creator-verifications/${verification.id}` : `/admin/creator-verifications?search=${encodeURIComponent(user.username)}`}><FiShield />Review Verification</Link></> : null}<button className={`${actionClass} bg-slate-100 text-slate-600 hover:bg-slate-200`} disabled={busy || currentUser?.id === user._id} onClick={() => statusMutation.mutate({ userId: user._id, status: user.status === "active" ? "suspended" : "active" })} type="button">{user.status === "active" ? "Suspend" : "Activate"}</button></div></td></tr>; })}</tbody></table></div>
      {!users.length ? <div className="grid place-items-center p-12 text-center"><FiUsers className="text-3xl text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-500">No users match your filters.</p></div> : null}
    </section></div>;
}
export default UserManagement;
