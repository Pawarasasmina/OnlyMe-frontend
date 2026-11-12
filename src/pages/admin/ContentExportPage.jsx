import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useState } from "react";
import { FiDownload, FiFileText, FiShield, FiUser } from "react-icons/fi";
import GovernanceTargetPicker from "../../components/admin/GovernanceTargetPicker";
import { adminOperationsService as service } from "../../services/adminOperationsService";

const input = "mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-400";
const choices = [
  __uiTuple(["USER", { __uiMessage: "admin.userData" }, { __uiMessage: "admin.chooseAPersonThenExportEverythingOrOne" }, FiUser]),
  __uiTuple(["CONTENT", { __uiMessage: "admin.specificContent" }, { __uiMessage: "admin.exportOneSelectedPostStorySeenOrWorld" }, FiFileText]),
  __uiTuple(["REPORT", { __uiMessage: "admin.specificReport" }, { __uiMessage: "admin.exportOneModerationCaseAndItsActionHistory" }, FiShield]),
];
export default function ContentExportPage() {
  __useUiLanguage();
  const [subject, setSubject] = useState("USER"); const [targetId, setTargetId] = useState("");
  const [section, setSection] = useState("COMPLETE"); const [contentType, setContentType] = useState("ALL");
  const [reason, setReason] = useState("Administrative history request"); const [data, setData] = useState(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const changeSubject = (value) => { setSubject(value); setTargetId(""); setData(null); setError(""); };
  const generate = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setData(null);
    try {
      const response = subject === "USER"
        ? await service.exportUserPackage({ id: targetId, section, reason })
        : await service.exportHistory({ type: subject, id: targetId, reason });
      setData(response.data.data.export);
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message); }
    finally { setBusy(false); }
  };
  const download = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `onlyme-${subject.toLowerCase()}-${subject === "USER" ? section.toLowerCase() : "history"}.json`; link.click(); URL.revokeObjectURL(url); };
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-3xl bg-slate-950 p-7 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-orange-400">{__msg("system.ContentExportPage.2271f3595d")}</p><h1 className="mt-2 text-3xl font-black">{__msg("system.AdminLayout.ee833cade6")}</h1><p className="mt-2 text-sm text-slate-300">{__msg("system.ContentExportPage.3eb8966868")}</p></header>
    <div className="grid gap-3 md:grid-cols-3">{choices.map(([value, title, description, Icon]) => <button className={`rounded-2xl border p-5 text-left transition ${subject === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "bg-white hover:border-slate-300"}`} key={value} onClick={() => changeSubject(value)} type="button"><Icon className={subject === value ? "text-2xl text-orange-500" : "text-2xl text-slate-400"} /><strong className="mt-3 block">{title}</strong><small className="mt-1 block leading-5 text-slate-500">{description}</small></button>)}</div>
    <form className="rounded-3xl border bg-white p-6 shadow-sm" onSubmit={generate}>
      <div className="grid gap-6 lg:grid-cols-2"><div>
        {subject === "USER" && <label className="block text-sm font-black">{__msg("system.ContentExportPage.5b98cb36f4")}<select className={input} value={section} onChange={(event) => { setSection(event.target.value); setData(null); }}><option value="COMPLETE">{__msg("system.ContentExportPage.375da58215")}</option><option value="ACCOUNT">{__msg("system.ContentExportPage.ab9599d627")}</option><option value="MODERATION">{__msg("system.ContentExportPage.de584af375")}</option><option value="FINANCE">{__msg("system.ContentExportPage.682ec5ba24")}</option><option value="CONTENT">{__msg("system.ContentExportPage.ec559afe4d")}</option></select></label>}
        {subject === "CONTENT" && <label className="block text-sm font-black">{__msg("system.ContentExportPage.de15f75372")}<select className={input} value={contentType} onChange={(event) => { setContentType(event.target.value); setTargetId(""); setData(null); }}><option value="ALL">{__msg("system.ContentExportPage.626a5b9cd0")}</option><option value="PUBLICATION">{__msg("system.ContentExportPage.6e057e17ee")}</option><option value="POST">{__msg("system.ContentExportPage.ab0b943b6b")}</option><option value="STORY">{__msg("admin.stories")}</option></select></label>}
        <label className={`${subject === "REPORT" ? "" : "mt-5"} block text-sm font-black`}>{__msg("creator.choose")} {subject === "USER" ? __msg("system.ContentExportPage.70d2b57103") : subject === "REPORT" ? __msg("system.ContentExportPage.f2a43deeed") : __msg("system.ContentExportPage.040f06fd77")}<GovernanceTargetPicker contentType={contentType} key={`${subject}:${contentType}`} type={subject} value={targetId} onChange={(value) => { setTargetId(value); setData(null); }} /></label>
      </div><div><label className="block text-sm font-black">{__msg("system.ContentExportPage.e3499d4dbc")}<textarea className={`${input} min-h-32 font-normal`} maxLength="1000" required value={reason} onChange={(event) => setReason(event.target.value)} placeholder={__msg("system.ContentExportPage.1fa631dab0")} /></label><div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600"><strong className="block text-slate-900">{__msg("system.ContentExportPage.995d362e20")}</strong>{subject === "USER" ? section === "COMPLETE" ? __msg("system.ContentExportPage.7e5992c770") : { ACCOUNT: __msg("admin.accountProfileDevicesLoginHistoryAndActiveHolds"), MODERATION: __msg("admin.reportsEnforcementDecisionsReasonsAndHolds"), FINANCE: __msg("admin.walletAndImmutableFinancialLedgerHistory"), CONTENT: __msg("admin.publicationsPostsAndStoriesCreatedByTheUser") }[section] : subject === "CONTENT" ? __msg("system.ContentExportPage.b2848b0609") : __msg("system.ContentExportPage.97ed08c8f3")}</div></div></div>
      {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{__systemMessage(error)}</p>}
      <button className="mt-6 w-full rounded-xl bg-slate-950 py-3.5 font-black text-white disabled:opacity-40" disabled={!targetId || reason.trim().length < 3 || busy}>{busy ? __msg("system.ContentExportPage.0405845720") : __msg("system.ContentExportPage.172651d30f")}</button>
      {data && <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-black text-white" onClick={download} type="button"><FiDownload /> {__msg("system.ContentExportPage.d296a30a06")}</button>}
    </form>
  </div>;
}
