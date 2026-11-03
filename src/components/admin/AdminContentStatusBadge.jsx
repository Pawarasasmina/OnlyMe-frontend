import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
const colors = { DRAFT: "bg-slate-100 text-slate-700", PENDING_REVIEW: "bg-amber-100 text-amber-800", CHANGES_REQUESTED: "bg-orange-100 text-orange-800", PUBLISHED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-red-100 text-red-800", ARCHIVED: "bg-violet-100 text-violet-800" };
export default function AdminContentStatusBadge({ status }) {
  __useUiLanguage(); return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${colors[status] || colors.DRAFT}`}>{__enumLabel(String(status || "UNKNOWN").replaceAll("_", " "))}</span>; }
