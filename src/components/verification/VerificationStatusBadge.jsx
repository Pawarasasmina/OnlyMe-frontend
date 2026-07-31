const styles = {
  NOT_STARTED: "bg-slate-500/15 text-slate-200",
  DRAFT: "bg-amber-500/15 text-amber-200",
  PENDING_REVIEW: "bg-blue-500/15 text-blue-200",
  CHANGES_REQUESTED: "bg-orange-500/15 text-orange-200",
  APPROVED: "bg-emerald-500/15 text-emerald-200",
  REJECTED: "bg-red-500/15 text-red-200",
};

const labels = {
  NOT_STARTED: "Not started",
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function VerificationStatusBadge({ status = "NOT_STARTED" }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status] || styles.NOT_STARTED}`}>{labels[status] || status}</span>;
}

export default VerificationStatusBadge;
