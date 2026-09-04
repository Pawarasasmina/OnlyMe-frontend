import { FiCheckCircle, FiShield } from "react-icons/fi";

const items = [
  ["evidence", "Evidence matches the report", "The captured content supports the reason selected by the reporter."],
  ["violation", "Platform rules checked", "I compared the evidence with the relevant community rule."],
  ["context", "Context and intent reviewed", "I checked the surrounding conversation, caption, or profile context."],
  ["proportionate", "Action is proportionate", "The selected outcome matches the severity and account history."],
];

export default function ModerationChecklist({ checks, onChange }) {
  const completed = items.filter(([key]) => checks[key]).length;
  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FiShield className="text-orange-500" /><h4 className="font-black">Review checklist</h4></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${completed === items.length ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"}`}>{completed}/{items.length}</span></div>
    <p className="mt-1 text-xs text-slate-500">Complete these quick checks before making a decision.</p>
    <div className="mt-3 grid gap-2 md:grid-cols-2">{items.map(([key, title, description]) => <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${checks[key] ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-orange-300"}`} key={key}><input checked={checks[key]} className="mt-1 h-4 w-4 accent-emerald-600" onChange={(event) => onChange({ ...checks, [key]: event.target.checked })} type="checkbox" /><span><span className="flex items-center gap-1.5 text-sm font-bold">{checks[key] && <FiCheckCircle className="text-emerald-600" />}{title}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{description}</span></span></label>)}</div>
  </section>;
}
