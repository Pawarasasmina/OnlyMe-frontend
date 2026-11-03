import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { FiCopy, FiEyeOff, FiFlag, FiSlash, FiUser } from "react-icons/fi";
import FanModal from "../fanWeb/shared/FanModal";

const REPORT_REASONS = [
  __uiTuple(["SPAM", { __uiMessage: "social.spam" }]),
  __uiTuple(["HARASSMENT", { __uiMessage: "social.harassment" }]),
  __uiTuple(["HATE", { __uiMessage: "social.hate" }]),
  __uiTuple(["SEXUAL_CONTENT", { __uiMessage: "discover.sexualContent" }]),
  __uiTuple(["VIOLENCE", { __uiMessage: "discover.violence" }]),
  __uiTuple(["SCAM", { __uiMessage: "discover.scam" }]),
  __uiTuple(["OTHER", { __uiMessage: "admin.other" }]),
];

function MenuButton({ children, danger = false, icon: Icon, onClick }) {
  __useUiLanguage();
  return (
    <button className={`discover-more-row ${danger ? "is-danger" : ""}`} onClick={onClick} type="button">
      <span>{Icon ? <Icon aria-hidden="true" /> : null}</span>
      <b>{children}</b>
    </button>
  );
}

function DiscoverMoreMenu({ busy = false, creator, isOpen, onBlock, onClose, onCopyLink, onHide, onReport, onViewProfile }) {
  __useUiLanguage();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");

  const submitReport = async (event) => {
    event.preventDefault();
    await onReport({ reason, details });
    setReporting(false);
    setDetails("");
  };

  return (
    <FanModal className="max-w-md" isOpen={isOpen} onClose={onClose} title={reporting ? __msg("discover.reportCreator") : creator?.name || __msg("discover.discoverOptions")}>
      {reporting ? (
        <form onSubmit={submitReport}>
          <p className="text-xs leading-5 text-atseen-muted">{__msg("discover.yourReportIsPrivateAndReviewedByModeration")}</p>
          <label className="mt-4 block text-xs font-bold text-atseen-muted">{__msg("discover.reason")}<select className="mt-2 w-full rounded-xl border border-atseen-line bg-atseen-surface-2 px-3 py-3 text-sm text-white outline-none" onChange={(event) => setReason(event.target.value)} value={reason}>
              {REPORT_REASONS.map(([value, label]) => <option className="bg-atseen-bg-2 text-white" key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-xs font-bold text-atseen-muted">{__msg("discover.additionalDetails")}<textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-atseen-surface-2 p-3 text-sm text-white outline-none" maxLength={1000} onChange={(event) => setDetails(event.target.value)} value={details} />
          </label>
          <div className="mt-5 flex gap-2">
            <button className="flex-1 rounded-full border border-atseen-line py-3 text-sm font-bold" disabled={busy} onClick={() => setReporting(false)} type="button">{__msg("discover.back")}</button>
            <button className="flex-1 rounded-full bg-atseen-danger py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? __msg("discover.submitting") : __msg("discover.submit")}</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-1">
          <MenuButton icon={FiUser} onClick={onViewProfile}>{__msg("discover.viewProfile")}</MenuButton>
          <MenuButton icon={FiCopy} onClick={onCopyLink}>{__msg("discover.copyLink")}</MenuButton>
          <MenuButton icon={FiEyeOff} onClick={onHide}>{__msg("discover.notInterested")}</MenuButton>
          <MenuButton icon={FiFlag} onClick={() => setReporting(true)}>{__msg("discover.report")}</MenuButton>
          <MenuButton danger icon={FiSlash} onClick={onBlock}>{__msg("discover.blockAccount")}</MenuButton>
        </div>
      )}
    </FanModal>
  );
}

export default DiscoverMoreMenu;
