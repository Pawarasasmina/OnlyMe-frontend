import { Link } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiEdit3, FiShield } from "react-icons/fi";
import VerificationStatusBadge from "./VerificationStatusBadge";

const copy = {
  NOT_STARTED: { title: "Complete Creator Verification", message: "Submit your identity details and documents for manual admin review before accessing creator publishing and monetization features.", action: "Start Verification", icon: FiShield },
  DRAFT: { title: "Verification Incomplete", message: "Your verification application has not been submitted.", action: "Continue Verification", icon: FiEdit3 },
  PENDING_REVIEW: { title: "Verification Under Review", message: "Your application has been submitted and is waiting for manual admin review.", icon: FiClock },
  CHANGES_REQUESTED: { title: "Changes Required", action: "Update and Resubmit", icon: FiAlertTriangle },
  APPROVED: { title: "Creator Approved", message: "Your creator account has been approved.", action: "Open Creator Studio", icon: FiCheckCircle },
  REJECTED: { title: "Verification Rejected", icon: FiAlertTriangle },
};

function VerificationStatusCard({ verification }) {
  const status = verification?.status || "NOT_STARTED";
  const state = copy[status] || copy.NOT_STARTED;
  const Icon = state.icon;
  const message = status === "CHANGES_REQUESTED"
    ? verification.creatorVisibleMessage || "An administrator requested updates to your verification application."
    : status === "REJECTED"
      ? verification.creatorVisibleMessage || verification.rejectionReason || "Your creator verification was rejected."
      : state.message;
  const destination = status === "APPROVED" ? "/creator/studio" : "/creator/verification";

  return <section className={`rounded-3xl border p-6 ${status === "CHANGES_REQUESTED" || status === "REJECTED" ? "border-orange-400/30 bg-orange-500/10" : "border-white/10 bg-brand-dark/60"}`}>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl text-brand-secondary"><Icon /></span><div><VerificationStatusBadge status={status} /><h2 className="mt-3 text-xl font-black">{state.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-brand-mist/65">{message}</p>{status === "PENDING_REVIEW" && verification.submittedAt ? <p className="mt-3 text-xs text-brand-mist/45">Submitted {new Date(verification.submittedAt).toLocaleString()}</p> : null}</div></div>
      {state.action ? <Link className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-orange-500" to={destination}>{state.action}</Link> : null}
    </div>
    {status === "CHANGES_REQUESTED" && verification.changesRequestedReasons?.length ? <ul className="mt-5 list-disc space-y-1 rounded-2xl bg-black/15 px-8 py-4 text-sm text-orange-100">{verification.changesRequestedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
  </section>;
}

export default VerificationStatusCard;
