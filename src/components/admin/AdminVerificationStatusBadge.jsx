import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
const styles = {
  NOT_STARTED: "bg-slate-100 text-slate-600",
  DRAFT: "bg-amber-100 text-amber-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};
function AdminVerificationStatusBadge({ status }) {
  __useUiLanguage();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || styles.NOT_STARTED}`}>{__enumLabel(String(status || "NOT_STARTED").replaceAll("_", " "))}</span>;
}
export default AdminVerificationStatusBadge;
