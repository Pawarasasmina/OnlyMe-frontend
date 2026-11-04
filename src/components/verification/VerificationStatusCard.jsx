import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiEdit3, FiShield } from "react-icons/fi";
import VerificationStatusBadge from "./VerificationStatusBadge";

const copy = {
  NOT_STARTED: { get title() { return __msg("verification.completeCreatorVerification"); }, get message() { return __msg("verification.submitYourIdentityDetailsAndDocumentsForManualAdmin"); }, get action() { return __msg("verification.startVerification_a9e4fd"); }, icon: FiShield },
  DRAFT: { get title() { return __msg("verification.verificationIncomplete"); }, get message() { return __msg("verification.yourVerificationApplicationHasNotBeenSubmitted"); }, get action() { return __msg("verification.continueVerification"); }, icon: FiEdit3 },
  PENDING_REVIEW: { get title() { return __msg("verification.verificationUnderReview"); }, get message() { return __msg("verification.yourApplicationHasBeenSubmittedAndIsWaitingFor"); }, icon: FiClock },
  CHANGES_REQUESTED: { get title() { return __msg("verification.changesRequired"); }, get action() { return __msg("verification.updateAndResubmit"); }, icon: FiAlertTriangle },
  APPROVED: { get title() { return __msg("verification.creatorApproved"); }, get message() { return __msg("verification.yourCreatorAccountHasBeenApproved"); }, get action() { return __msg("verification.openCreatorStudio"); }, icon: FiCheckCircle },
  REJECTED: { get title() { return __msg("verification.verificationRejected"); }, icon: FiAlertTriangle },
};

function VerificationStatusCard({ verification }) {
  __useUiLanguage();
  const status = verification?.status || "NOT_STARTED";
  const state = copy[status] || copy.NOT_STARTED;
  const Icon = state.icon;
  const message = status === "CHANGES_REQUESTED"
    ? verification.creatorVisibleMessage || __msg("verification.anAdministratorRequestedUpdatesToYourVerificationApplication")
    : status === "REJECTED"
      ? verification.creatorVisibleMessage || verification.rejectionReason || __msg("verification.yourCreatorVerificationWasRejected")
      : state.message;
  const destination = status === "APPROVED" ? "/creator/studio" : "/creator/verification";

  return <section className={`rounded-3xl border p-6 ${status === "CHANGES_REQUESTED" || status === "REJECTED" ? "border-orange-400/30 bg-orange-500/10" : "border-white/10 bg-brand-dark/60"}`}>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl text-brand-secondary"><Icon /></span><div><VerificationStatusBadge status={status} /><h2 dir="auto" className="mt-3 text-xl font-black">{state.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-brand-mist/65">{message}</p>{status === "PENDING_REVIEW" && verification.submittedAt ? <p className="mt-3 text-xs text-brand-mist/45">{__msg("verification.submitted")} {new Date(verification.submittedAt).toLocaleString(__uiLocale())}</p> : null}</div></div>
      {state.action ? <Link className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-orange-500" to={destination}>{state.action}</Link> : null}
    </div>
    {status === "CHANGES_REQUESTED" && verification.changesRequestedReasons?.length ? <ul className="mt-5 list-disc space-y-1 rounded-2xl bg-black/15 px-8 py-4 text-sm text-orange-100">{verification.changesRequestedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
  </section>;
}

export default VerificationStatusCard;
