import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
const styles = {
  NOT_STARTED: "bg-slate-500/15 text-slate-200",
  DRAFT: "bg-amber-500/15 text-amber-200",
  PENDING_REVIEW: "bg-blue-500/15 text-blue-200",
  CHANGES_REQUESTED: "bg-orange-500/15 text-orange-200",
  APPROVED: "bg-emerald-500/15 text-emerald-200",
  REJECTED: "bg-red-500/15 text-red-200",
};

const labels = {
  get NOT_STARTED() { return __msg("verification.notStarted"); },
  get DRAFT() { return __msg("verification.draft"); },
  get PENDING_REVIEW() { return __msg("verification.pendingReview"); },
  get CHANGES_REQUESTED() { return __msg("content.changesRequested"); },
  get APPROVED() { return __msg("verification.approved"); },
  get REJECTED() { return __msg("verification.rejected"); },
};

function VerificationStatusBadge({ status = "NOT_STARTED" }) {
  __useUiLanguage();
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status] || styles.NOT_STARTED}`}>{labels[status] || status}</span>;
}

export default VerificationStatusBadge;
