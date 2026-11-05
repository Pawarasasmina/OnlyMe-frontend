import { useState } from "react";
import { FiDownload, FiFileText, FiShield, FiUser } from "react-icons/fi";
import GovernanceTargetPicker from "../../components/admin/GovernanceTargetPicker";
import { adminOperationsService as service } from "../../services/adminOperationsService";

const input = "mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-400";
const choices = [
  ["USER", "User data", "Choose a person, then export everything or one category.", FiUser],
  ["CONTENT", "Specific content", "Export one selected post, story, Seen, or World.", FiFileText],
  ["REPORT", "Specific report", "Export one moderation case and its action history.", FiShield],
];
export default function ContentExportPage() {
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
    <header className="rounded-3xl bg-slate-950 p-7 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-orange-400">Data & evidence</p><h1 className="mt-2 text-3xl font-black">Export Center</h1><p className="mt-2 text-sm text-slate-300">Choose exactly what you need. Every generated export is recorded in the audit log.</p></header>
    <div className="grid gap-3 md:grid-cols-3">{choices.map(([value, title, description, Icon]) => <button className={`rounded-2xl border p-5 text-left transition ${subject === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "bg-white hover:border-slate-300"}`} key={value} onClick={() => changeSubject(value)} type="button"><Icon className={subject === value ? "text-2xl text-orange-500" : "text-2xl text-slate-400"} /><strong className="mt-3 block">{title}</strong><small className="mt-1 block leading-5 text-slate-500">{description}</small></button>)}</div>
    <form className="rounded-3xl border bg-white p-6 shadow-sm" onSubmit={generate}>
      <div className="grid gap-6 lg:grid-cols-2"><div>
        {subject === "USER" && <label className="block text-sm font-black">Export section<select className={input} value={section} onChange={(event) => { setSection(event.target.value); setData(null); }}><option value="COMPLETE">Complete user record</option><option value="ACCOUNT">Account, profile and login history</option><option value="MODERATION">Reports, actions and holds</option><option value="FINANCE">Wallet, purchases, earnings and refunds</option><option value="CONTENT">All content created by this user</option></select></label>}
        {subject === "CONTENT" && <label className="block text-sm font-black">Content type<select className={input} value={contentType} onChange={(event) => { setContentType(event.target.value); setTargetId(""); setData(null); }}><option value="ALL">All content types</option><option value="PUBLICATION">Seen and Worlds</option><option value="POST">Posts and notes</option><option value="STORY">Stories</option></select></label>}
        <label className={`${subject === "REPORT" ? "" : "mt-5"} block text-sm font-black`}>Choose {subject === "USER" ? "a user" : subject === "REPORT" ? "a report" : "content"}<GovernanceTargetPicker contentType={contentType} key={`${subject}:${contentType}`} type={subject} value={targetId} onChange={(value) => { setTargetId(value); setData(null); }} /></label>
      </div><div><label className="block text-sm font-black">Why is this export needed?<textarea className={`${input} min-h-32 font-normal`} maxLength="1000" required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Creator appeal review" /></label><div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600"><strong className="block text-slate-900">This export will include:</strong>{subject === "USER" ? section === "COMPLETE" ? "Account data, login history, moderation, financial history and created content." : { ACCOUNT: "Account, profile, devices/login history and active holds.", MODERATION: "Reports, enforcement decisions, reasons and holds.", FINANCE: "Wallet and immutable financial ledger history.", CONTENT: "Publications, posts and stories created by the user." }[section] : subject === "CONTENT" ? "The selected content, reports, actions, holds and timestamps." : "The selected report, frozen snapshot and administrative actions."}</div></div></div>
      {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      <button className="mt-6 w-full rounded-xl bg-slate-950 py-3.5 font-black text-white disabled:opacity-40" disabled={!targetId || reason.trim().length < 3 || busy}>{busy ? "Preparing export…" : "Generate audited export"}</button>
      {data && <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-black text-white" onClick={download} type="button"><FiDownload /> Download JSON</button>}
    </form>
  </div>;
}
