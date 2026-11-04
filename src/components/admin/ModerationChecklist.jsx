import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiCheckCircle, FiShield } from "react-icons/fi";

const items = [
  __uiTuple(["evidence", { __uiMessage: "admin.evidenceMatchesTheReport" }, { __uiMessage: "admin.theCapturedContentSupportsTheReasonSelectedBy" }]),
  __uiTuple(__uiTuple(["violation", { __uiMessage: "admin.platformRulesChecked" }, { __uiMessage: "admin.iComparedTheEvidenceWithTheRelevantCommunity" }])),
  __uiTuple(__uiTuple(["context", { __uiMessage: "admin.contextAndIntentReviewed" }, { __uiMessage: "admin.iCheckedTheSurroundingConversationCaptionOrProfile" }])),
  __uiTuple(["proportionate", { __uiMessage: "admin.actionIsProportionate" }, { __uiMessage: "admin.theSelectedOutcomeMatchesTheSeverityAndAccount" }]),
];

export default function ModerationChecklist({ checks, onChange }) {
  __useUiLanguage();
  const completed = items.filter(([key]) => checks[key]).length;
  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FiShield className="text-orange-500" /><h4 className="font-black">{__msg("admin.reviewChecklist")}</h4></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${completed === items.length ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"}`}>{completed}/{items.length}</span></div>
    <p className="mt-1 text-xs text-slate-500">{__msg("admin.completeTheseQuickChecksBeforeMakingADecision")}</p>
    <div className="mt-3 grid gap-2 md:grid-cols-2">{items.map(([key, title, description]) => <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${checks[key] ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-orange-300"}`} key={key}><input checked={checks[key]} className="mt-1 h-4 w-4 accent-emerald-600" onChange={(event) => onChange({ ...checks, [key]: event.target.checked })} type="checkbox" /><span><span className="flex items-center gap-1.5 text-sm font-bold">{checks[key] && <FiCheckCircle className="text-emerald-600" />}{title}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{description}</span></span></label>)}</div>
  </section>;
}
