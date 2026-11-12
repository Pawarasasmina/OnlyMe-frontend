import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useState } from "react";
import { FiKey, FiPlus, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import { adminService } from "../../services/adminService";

const roleCopy = {
  MAIN_ADMIN: ["Main Admin", "Full platform, finance, security, and staff access"],
  MODERATOR: __uiTuple(["Moderator", { __uiMessage: "admin.reportQueueAppealsUsersAndModerationTools" }]),
  FINANCE: __uiTuple(["Finance", { __uiMessage: "admin.walletsPayoutsRefundsAndBankOperationsOnly" }]),
};
const empty = { name: "", email: "", password: "", adminRole: "MODERATOR", get reason() { return __msg("admin.newStaffAccount"); } };
const messageOf = (error) => error?.response?.data?.message || error?.message || __msg("content.somethingWentWrong");

export default function AdminStaffPage() {
  __useUiLanguage();
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
    try { await adminService.createStaff(form); setForm(empty); setNotice(__msg("system.AdminStaffPage.bf21d38d35")); await load(); }
    catch (err) { setError(messageOf(err)); }
    finally { setSaving(false); }
  };

  const update = async (member, change) => {
    const reason = window.prompt(__msg("admin.reasonForThisStaffAccountChange"), change.status === "suspended" ? __msg("admin.accessSuspendedByMainAdmin") : __msg("admin.staffPermissionsUpdated"));
    if (!reason?.trim()) return;
    setError("");
    try { await adminService.updateStaff(member.id, { ...change, reason }); setNotice(__msg("system.AdminStaffPage.61b9dbf969")); await load(); }
    catch (err) { setError(messageOf(err)); }
  };

  const resetPassword = async (member) => {
    const password = window.prompt(__msg("admin.enterANewTemporaryPasswordForValue0Minimum", { value0: member.name }));
    if (!password) return;
    if (password.length < 8) { setError(__msg("system.AdminStaffPage.b49016f994")); return; }
    const reason = window.prompt(__msg("admin.reasonForResettingThisPassword"), __msg("admin.mainAdminPasswordReset"));
    if (!reason?.trim()) return;
    setError("");
    try { await adminService.resetStaffPassword(member.id, { password, reason }); setNotice(__msg("system.AdminStaffPage.d3d4f6b38a")); }
    catch (err) { setError(messageOf(err)); }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-300"><FiShield /> {__msg("system.AdminStaffPage.c0b2c91cb9")}</div><h1 className="text-3xl font-black tracking-tight">{__msg("system.AdminLayout.428dd57903")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{__msg("system.AdminStaffPage.9b1f4947c6")}</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"><p className="text-3xl font-black">{staff.filter((item) => item.status === "active").length}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{__msg("system.AdminStaffPage.b8dda8884b")}</p></div></div>
    </header>
    {(error || notice) && <div className={`rounded-2xl border p-4 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || notice}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="flex items-center gap-2 text-lg font-black"><FiUsers /> {__msg("system.AdminStaffPage.bb9ef6c510")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("system.AdminStaffPage.876f69bace")}</p></div></div>
        {loading ? <div className="p-10 text-center text-slate-400">{__msg("system.AdminStaffPage.11a036bc66")}</div> : <div className="divide-y divide-slate-100">{staff.map((member) => <article className="p-5" key={member.id}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}><FiUserCheck /></span><div className="min-w-0"><h3 className="truncate font-black">{member.name}</h3><p className="truncate text-sm text-slate-500">{member.email}</p><p className="mt-1 text-xs text-slate-400">{__msg("system.AdminStaffPage.9cc1ef9d30")} {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString(__uiLocale()) : __msg("system.AdminStaffPage.80c3052d33")}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{__enumLabel(member.status)}</span></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><select aria-label={__msg("system.AdminStaffPage.32c3b1cb10", { value0: member.name })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={member.adminRole} onChange={(event) => update(member, { adminRole: event.target.value })}>{Object.entries(roleCopy).map(([value, copy]) => <option value={value} key={value}>{copy[0]}</option>)}</select><button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50" onClick={() => resetPassword(member)} type="button"><FiKey className="me-2 inline" />{__msg("auth.resetPassword")}</button><button className={`rounded-xl px-3 py-2 text-sm font-bold ${member.status === "active" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`} onClick={() => update(member, { status: member.status === "active" ? "suspended" : "active" })} type="button">{member.status === "active" ? __msg("system.AdminStaffPage.a86ca7b03a") : __msg("system.AdminStaffPage.1f10554914")}</button></div>
        </article>)}</div>}
      </section>
      <aside className="space-y-5"><form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={create}><h2 className="flex items-center gap-2 text-lg font-black"><FiPlus /> {__msg("system.AdminStaffPage.b91195f1ab")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("system.AdminStaffPage.03f4e8317a")}</p><div className="mt-5 space-y-4">{[[__msg("system.copy.eeb692087d62"), "name", "text"], [__msg("system.copy.186c372608e9"), "email", "email"], [__msg("system.copy.62d6062845b8"), "password", "password"]].map(([label, key, type]) => <label className="block text-sm font-bold" key={key}>{label}<input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" minLength={key === "password" ? 8 : undefined} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required type={type} value={form[key]} /></label>)}<label className="block text-sm font-bold">{__msg("system.AdminStaffPage.4aa8cb5b3d")}<select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal" onChange={(event) => setForm({ ...form, adminRole: event.target.value })} value={form.adminRole}>{Object.entries(roleCopy).map(([value, copy]) => <option value={value} key={value}>{copy[0]} — {copy[1]}</option>)}</select></label><label className="block text-sm font-bold">{__msg("system.AdminStaffPage.a1c58e6160")}<textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" onChange={(event) => setForm({ ...form, reason: event.target.value })} required value={form.reason} /></label><button className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50" disabled={saving} type="submit">{saving ? __msg("profile.creating") : __msg("system.AdminStaffPage.0da9111d24")}</button></div></form>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black">{__msg("system.AdminStaffPage.76f9bc85ec")}</h3><div className="mt-3 space-y-3">{Object.entries(roleCopy).map(([value, copy]) => <div key={value}><p className="text-sm font-bold">{copy[0]}</p><p className="text-xs leading-5 text-slate-500">{copy[1]}</p></div>)}</div></div>
      </aside>
    </div>
  </div>;
}
