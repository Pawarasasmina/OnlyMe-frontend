import { useEffect, useState } from "react";
import { FiKey, FiPlus, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import { adminService } from "../../services/adminService";

const roleCopy = {
  MAIN_ADMIN: ["Main Admin", "Full platform, finance, security, and staff access"],
  MODERATOR: ["Moderator", "Report queue, appeals, users, and moderation tools"],
  FINANCE: ["Finance", "Wallets, payouts, refunds, and bank operations only"],
};
const empty = { name: "", email: "", password: "", adminRole: "MODERATOR", reason: "New staff account" };
const messageOf = (error) => error?.response?.data?.message || error?.message || "Something went wrong";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const response = await adminService.getStaff(); setStaff(response.data.data.staff || []); }
    catch (err) { setError(messageOf(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try { await adminService.createStaff(form); setForm(empty); setNotice("Staff account created. Share the temporary password securely."); await load(); }
    catch (err) { setError(messageOf(err)); }
    finally { setSaving(false); }
  };

  const update = async (member, change) => {
    const reason = window.prompt("Reason for this staff-account change:", change.status === "suspended" ? "Access suspended by Main Admin" : "Staff permissions updated");
    if (!reason?.trim()) return;
    setError("");
    try { await adminService.updateStaff(member.id, { ...change, reason }); setNotice("Staff access updated and existing sessions revoked."); await load(); }
    catch (err) { setError(messageOf(err)); }
  };

  const resetPassword = async (member) => {
    const password = window.prompt(`Enter a new temporary password for ${member.name} (minimum 8 characters):`);
    if (!password) return;
    if (password.length < 8) { setError("Temporary password must be at least 8 characters."); return; }
    const reason = window.prompt("Reason for resetting this password:", "Main Admin password reset");
    if (!reason?.trim()) return;
    setError("");
    try { await adminService.resetStaffPassword(member.id, { password, reason }); setNotice("Password reset. All of this staff member’s sessions were revoked."); }
    catch (err) { setError(messageOf(err)); }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-300"><FiShield /> MAIN ADMIN ONLY</div><h1 className="text-3xl font-black tracking-tight">Admin team & access</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Create individual staff logins and give each person only the tools they need. Role changes and suspensions revoke active sessions immediately.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"><p className="text-3xl font-black">{staff.filter((item) => item.status === "active").length}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active staff</p></div></div>
    </header>
    {(error || notice) && <div className={`rounded-2xl border p-4 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || notice}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="flex items-center gap-2 text-lg font-black"><FiUsers /> Staff accounts</h2><p className="mt-1 text-sm text-slate-500">Every administrator must use their own login.</p></div></div>
        {loading ? <div className="p-10 text-center text-slate-400">Loading staff…</div> : <div className="divide-y divide-slate-100">{staff.map((member) => <article className="p-5" key={member.id}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}><FiUserCheck /></span><div className="min-w-0"><h3 className="truncate font-black">{member.name}</h3><p className="truncate text-sm text-slate-500">{member.email}</p><p className="mt-1 text-xs text-slate-400">Last login: {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : "Never"}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{member.status}</span></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><select aria-label={`Role for ${member.name}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={member.adminRole} onChange={(event) => update(member, { adminRole: event.target.value })}>{Object.entries(roleCopy).map(([value, copy]) => <option value={value} key={value}>{copy[0]}</option>)}</select><button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50" onClick={() => resetPassword(member)} type="button"><FiKey className="me-2 inline" />Reset password</button><button className={`rounded-xl px-3 py-2 text-sm font-bold ${member.status === "active" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`} onClick={() => update(member, { status: member.status === "active" ? "suspended" : "active" })} type="button">{member.status === "active" ? "Suspend access" : "Restore access"}</button></div>
        </article>)}</div>}
      </section>
      <aside className="space-y-5"><form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={create}><h2 className="flex items-center gap-2 text-lg font-black"><FiPlus /> Add administrator</h2><p className="mt-1 text-sm text-slate-500">Create a secure, individual staff login.</p><div className="mt-5 space-y-4">{[["Full name", "name", "text"], ["Gmail or work email", "email", "email"], ["Temporary password", "password", "password"]].map(([label, key, type]) => <label className="block text-sm font-bold" key={key}>{label}<input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" minLength={key === "password" ? 8 : undefined} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required type={type} value={form[key]} /></label>)}<label className="block text-sm font-bold">Access role<select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal" onChange={(event) => setForm({ ...form, adminRole: event.target.value })} value={form.adminRole}>{Object.entries(roleCopy).map(([value, copy]) => <option value={value} key={value}>{copy[0]} — {copy[1]}</option>)}</select></label><label className="block text-sm font-bold">Creation reason<textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" onChange={(event) => setForm({ ...form, reason: event.target.value })} required value={form.reason} /></label><button className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50" disabled={saving} type="submit">{saving ? "Creating…" : "Create staff account"}</button></div></form>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black">Role boundaries</h3><div className="mt-3 space-y-3">{Object.entries(roleCopy).map(([value, copy]) => <div key={value}><p className="text-sm font-bold">{copy[0]}</p><p className="text-xs leading-5 text-slate-500">{copy[1]}</p></div>)}</div></div>
      </aside>
    </div>
  </div>;
}
