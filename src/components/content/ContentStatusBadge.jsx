import { formatContentLabel } from "../../utils/content";
const colors = { DRAFT: "bg-slate-500/15 text-slate-200", PENDING_REVIEW: "bg-amber-500/15 text-amber-200", CHANGES_REQUESTED: "bg-orange-500/15 text-orange-200", PUBLISHED: "bg-emerald-500/15 text-emerald-200", REJECTED: "bg-red-500/15 text-red-200", ARCHIVED: "bg-violet-500/15 text-violet-200" };
export default function ContentStatusBadge({ status }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${colors[status] || colors.DRAFT}`}>{formatContentLabel(status)}</span>; }
