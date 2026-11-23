import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useState } from "react";
import { FiCheck, FiKey, FiLock, FiPlus, FiSave, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import { adminService } from "../../services/adminService";
import { useAdminDialog } from "../../components/admin/AdminDialogProvider";

const roleCopy = {
  MAIN_ADMIN: ["Main Admin", "Full platform, finance, security, and staff access"],
  MODERATOR: __uiTuple(["Moderator", { __uiMessage: "admin.reportQueueAppealsUsersAndModerationTools" }]),
  FINANCE: __uiTuple(["Finance", { __uiMessage: "admin.walletsPayoutsRefundsAndBankOperationsOnly" }]),
};
const empty = { name: "", email: "", password: "", adminRole: "MODERATOR", get reason() { return __msg("admin.newStaffAccount"); } };
const messageOf = (error) => error?.response?.data?.message || error?.message || __msg("content.somethingWentWrong");

export default function AdminStaffPage() {
  __useUiLanguage();
  const dialog = useAdminDialog();
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [rolePolicies, setRolePolicies] = useState({});
  const [selectedRole, setSelectedRole] = useState("MODERATOR");
  const [policySaving, setPolicySaving] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try { const [staffResponse, accessResponse] = await Promise.all([adminService.getStaff(), adminService.getRolePolicies()]); setStaff(staffResponse.data.data.staff || []); setPermissionCatalog(accessResponse.data.data.catalog || []); setRolePolicies(accessResponse.data.data.policies || {}); }
    catch (err) { setError(messageOf(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const permissionGroups = permissionCatalog.reduce((groups, permission) => ({ ...groups, [permission.group]: [...(groups[permission.group] || []), permission] }), {});
  const permissionDependencies = { "users.manage": "users.view", "verification.manage": "verification.view", "moderation.manage": "moderation.view", "finance.manage": "finance.view", "announcements.manage": "announcements.view", "governance.manage": "governance.view" };
  const togglePermission = (key) => setRolePolicies((current) => {
    const selected = new Set(current[selectedRole] || []);
    if (selected.has(key)) {
      selected.delete(key);
      Object.entries(permissionDependencies).filter(([, required]) => required === key).forEach(([dependent]) => selected.delete(dependent));
    } else {
      selected.add(key);
      if (permissionDependencies[key]) selected.add(permissionDependencies[key]);
    }
    return { ...current, [selectedRole]: [...selected] };
  });
  const saveRolePolicy = async () => {
    const reason = await dialog.prompt({ title: `Save ${roleCopy[selectedRole][0]} access?`, description: "This changes available pages and API capabilities. Affected staff will need to sign in again.", inputLabel: "Audit reason", defaultValue: "Role access policy updated by Main Admin", confirmLabel: "Save access" });
    if (!reason?.trim()) return;
    setPolicySaving(true); setError(""); setNotice("");
    try { await adminService.updateRolePolicy(selectedRole, { permissions: rolePolicies[selectedRole] || [], reason }); setNotice(`${roleCopy[selectedRole][0]} access saved. Affected staff must sign in again.`); await load(); }
    catch (err) { setError(messageOf(err)); }
    finally { setPolicySaving(false); }
  };

  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try { await adminService.createStaff(form); setForm(empty); setNotice(__msg("system.AdminStaffPage.bf21d38d35")); await load(); }
    catch (err) { setError(messageOf(err)); }
    finally { setSaving(false); }
  };

  const update = async (member, change) => {
    const reason = await dialog.prompt({ title: __msg("admin.reasonForThisStaffAccountChange"), inputLabel: "Audit reason", defaultValue: change.status === "suspended" ? __msg("admin.accessSuspendedByMainAdmin") : __msg("admin.staffPermissionsUpdated"), confirmLabel: "Apply change" });
    if (!reason?.trim()) return;
    setError("");
    try { await adminService.updateStaff(member.id, { ...change, reason }); setNotice(__msg("system.AdminStaffPage.61b9dbf969")); await load(); }
    catch (err) { setError(messageOf(err)); }
  };

  const resetPassword = async (member) => {
    const password = await dialog.prompt({ title: `Reset password for ${member.name}`, description: __msg("admin.enterANewTemporaryPasswordForValue0Minimum", { value0: member.name }), inputLabel: "Temporary password", inputType: "password", confirmLabel: "Continue" });
    if (!password) return;
    if (password.length < 8) { setError(__msg("system.AdminStaffPage.b49016f994")); return; }
    const reason = await dialog.prompt({ title: __msg("admin.reasonForResettingThisPassword"), inputLabel: "Audit reason", defaultValue: __msg("admin.mainAdminPasswordReset"), confirmLabel: "Reset password" });
    if (!reason?.trim()) return;
    setError("");
    try { await adminService.resetStaffPassword(member.id, { password, reason }); setNotice(__msg("system.AdminStaffPage.d3d4f6b38a")); }
    catch (err) { setError(messageOf(err)); }
  };

  const changeTwoFactor = async (member, action) => {
    const label = action === "DISABLE" ? "turn off and remove the current authenticator" : "remove the current authenticator and require a new setup";
    const reason = await dialog.prompt({ title: `${label[0].toUpperCase()}${label.slice(1)}?`, description: `${member.name} will be signed out of active sessions.`, inputLabel: "Audit reason", defaultValue: action === "DISABLE" ? "2FA disabled by Main Admin" : "New authenticator enrollment required by Main Admin", confirmLabel: action === "DISABLE" ? "Turn off 2FA" : "Require new setup", tone: "warning" });
    if (!reason?.trim()) return;
    setError(""); setNotice("");
    try { await adminService.updateStaffTwoFactor(member.id, { action, reason }); setNotice(action === "DISABLE" ? `2FA turned off for ${member.name}.` : `${member.name} must enroll a new authenticator.`); await load(); }
    catch (err) { setError(messageOf(err)); }
  };

  const changeRoleTwoFactor = async (adminRole, action) => {
    const roleName = roleCopy[adminRole][0];
    const operation = action === "DISABLE" ? "turn off 2FA" : "require a new authenticator";
    const reason = await dialog.prompt({ title: `${operation} for every ${roleName} account?`, description: "All affected staff will be signed out of active sessions.", inputLabel: "Audit reason", defaultValue: `${operation} for ${roleName} accounts`, confirmLabel: "Apply to role", tone: "warning" });
    if (!reason?.trim()) return;
    setError(""); setNotice("");
    try { const response = await adminService.updateRoleTwoFactor({ adminRole, action, reason }); setNotice(`${response.data.data.affected} ${roleName} account(s) updated.`); await load(); }
    catch (err) { setError(messageOf(err)); }
  };

  const deleteTestAccount = async (member) => {
    const reason = await dialog.prompt({ title: "Delete test account?", description: `${member.email} will be permanently deleted. This cannot be undone.`, inputLabel: "Audit reason", defaultValue: "Read-only AI test account no longer needed", confirmLabel: "Delete account", tone: "danger" });
    if (!reason?.trim()) return;
    setError(""); setNotice("");
    try { await adminService.deleteTestStaff(member.id, { reason }); setNotice(`${member.email} was deleted.`); await load(); }
    catch (err) { setError(messageOf(err)); }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-300"><FiShield /> {__msg("system.AdminStaffPage.c0b2c91cb9")}</div><h1 className="text-3xl font-black tracking-tight">{__msg("system.AdminLayout.428dd57903")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{__msg("system.AdminStaffPage.9b1f4947c6")}</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"><p className="text-3xl font-black">{staff.filter((item) => item.status === "active").length}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{__msg("system.AdminStaffPage.b8dda8884b")}</p></div></div>
    </header>
    {(error || notice) && <div className={`rounded-2xl border p-4 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || notice}</div>}
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6"><div><h2 className="flex items-center gap-2 text-xl font-black"><FiShield className="text-orange-500" /> Role access manager</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Choose exactly which pages and actions each staff role can use. Hidden pages are also blocked by the API.</p></div><div className="flex rounded-xl bg-slate-100 p-1">{["MODERATOR", "FINANCE"].map((role) => <button className={`rounded-lg px-4 py-2 text-sm font-black transition ${selectedRole === role ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`} key={role} onClick={() => setSelectedRole(role)} type="button">{roleCopy[role][0]}</button>)}</div></div>
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500"><strong className="text-slate-800">{(rolePolicies[selectedRole] || []).length}</strong> of {permissionCatalog.length} permissions selected</p><div className="flex gap-2"><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100" onClick={() => setRolePolicies((current) => ({ ...current, [selectedRole]: permissionCatalog.map((item) => item.key) }))} type="button">Select all</button><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100" onClick={() => setRolePolicies((current) => ({ ...current, [selectedRole]: [] }))} type="button">Clear all</button></div></div></div>
      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">{Object.entries(permissionGroups).map(([group, permissions]) => <fieldset className="rounded-2xl border border-slate-200 p-4" key={group}><legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-500">{group}</legend><div className="space-y-2">{permissions.map((permission) => { const checked = (rolePolicies[selectedRole] || []).includes(permission.key); return <button aria-pressed={checked} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-start transition ${checked ? "border-orange-300 bg-orange-50" : "border-transparent bg-slate-50 hover:border-slate-200"}`} key={permission.key} onClick={() => togglePermission(permission.key)} type="button"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white"}`}>{checked ? <FiCheck size={13} /> : null}</span><span><strong className="block text-sm text-slate-900">{permission.label}</strong><span className="mt-0.5 block text-xs leading-5 text-slate-500">{permission.description}</span></span></button>; })}</div></fieldset>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><p className="flex items-center gap-2 text-xs text-slate-500"><FiLock /> Main Admin always retains full access and cannot be restricted.</p><button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50" disabled={policySaving} onClick={saveRolePolicy} type="button"><FiSave />{policySaving ? "Saving…" : `Save ${roleCopy[selectedRole][0]} access`}</button></div>
    </section>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="flex items-center gap-2 text-lg font-black"><FiUsers /> {__msg("system.AdminStaffPage.bb9ef6c510")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("system.AdminStaffPage.876f69bace")}</p></div></div>
        {loading ? <div className="p-10 text-center text-slate-400">{__msg("system.AdminStaffPage.11a036bc66")}</div> : <div className="divide-y divide-slate-100">{staff.map((member) => <article className="p-5" key={member.id}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}><FiUserCheck /></span><div className="min-w-0"><h3 className="truncate font-black">{member.name}</h3><p className="truncate text-sm text-slate-500">{member.email}</p><p className="mt-1 text-xs text-slate-400">{__msg("system.AdminStaffPage.9cc1ef9d30")} {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString(__uiLocale()) : __msg("system.AdminStaffPage.80c3052d33")}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{__enumLabel(member.status)}</span></div>
          <div className="mt-3 flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${member.twoFactorEnabled ? "bg-emerald-50 text-emerald-700" : member.twoFactorRequired ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{member.twoFactorEnabled ? "2FA enabled" : member.twoFactorRequired ? "New setup required" : "2FA off"}</span>{member.readOnly ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">Read-only test</span> : null}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><select aria-label={__msg("system.AdminStaffPage.32c3b1cb10", { value0: member.name })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={member.adminRole} onChange={(event) => update(member, { adminRole: event.target.value })}>{Object.entries(roleCopy).map(([value, copy]) => <option value={value} key={value}>{copy[0]}</option>)}</select><button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50" onClick={() => resetPassword(member)} type="button"><FiKey className="me-2 inline" />{__msg("auth.resetPassword")}</button><button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700" onClick={() => changeTwoFactor(member, "DISABLE")} type="button">Remove / turn off 2FA</button><button className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700" onClick={() => changeTwoFactor(member, "REQUIRE_NEW")} type="button">Add new 2FA</button><button className={`rounded-xl px-3 py-2 text-sm font-bold ${member.status === "active" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`} onClick={() => update(member, { status: member.status === "active" ? "suspended" : "active" })} type="button">{member.status === "active" ? __msg("system.AdminStaffPage.a86ca7b03a") : __msg("system.AdminStaffPage.1f10554914")}</button>{member.readOnly ? <button className="rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white" onClick={() => deleteTestAccount(member)} type="button">Delete test account</button> : null}</div>
        </article>)}</div>}
      </section>
      <aside className="space-y-5"><form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={create}><h2 className="flex items-center gap-2 text-lg font-black"><FiPlus /> {__msg("system.AdminStaffPage.b91195f1ab")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("system.AdminStaffPage.03f4e8317a")}</p><div className="mt-5 space-y-4">{[[__msg("system.copy.eeb692087d62"), "name", "text"], [__msg("system.copy.186c372608e9"), "email", "email"], [__msg("system.copy.62d6062845b8"), "password", "password"]].map(([label, key, type]) => <label className="block text-sm font-bold" key={key}>{label}<input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" minLength={key === "password" ? 8 : undefined} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required type={type} value={form[key]} /></label>)}<label className="block text-sm font-bold">{__msg("system.AdminStaffPage.4aa8cb5b3d")}<select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal" onChange={(event) => setForm({ ...form, adminRole: event.target.value })} value={form.adminRole}>{Object.entries(roleCopy).map(([value, copy]) => <option value={value} key={value}>{copy[0]} — {copy[1]}</option>)}</select></label><label className="block text-sm font-bold">{__msg("system.AdminStaffPage.a1c58e6160")}<textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" onChange={(event) => setForm({ ...form, reason: event.target.value })} required value={form.reason} /></label><button className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50" disabled={saving} type="submit">{saving ? __msg("profile.creating") : __msg("system.AdminStaffPage.0da9111d24")}</button></div></form>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-black"><FiShield /> Role-wide 2FA control</h3><p className="mt-1 text-xs leading-5 text-slate-500">Apply a security reset to every account in a role. Existing authenticator secrets are permanently removed and sessions are revoked.</p><div className="mt-4 space-y-3">{Object.entries(roleCopy).map(([value, copy]) => <div className="rounded-xl border border-slate-200 p-3" key={value}><p className="text-sm font-black">{copy[0]}</p><div className="mt-2 grid grid-cols-2 gap-2"><button className="rounded-lg bg-slate-100 px-2 py-2 text-xs font-bold text-slate-700" onClick={() => changeRoleTwoFactor(value, "DISABLE")} type="button">Turn off all</button><button className="rounded-lg bg-orange-50 px-2 py-2 text-xs font-bold text-orange-700" onClick={() => changeRoleTwoFactor(value, "REQUIRE_NEW")} type="button">Require new setup</button></div></div>)}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black">{__msg("system.AdminStaffPage.76f9bc85ec")}</h3><div className="mt-3 space-y-3">{Object.entries(roleCopy).map(([value, copy]) => <div key={value}><p className="text-sm font-bold">{copy[0]}</p><p className="text-xs leading-5 text-slate-500">{copy[1]}</p></div>)}</div></div>
      </aside>
    </div>
  </div>;
}
