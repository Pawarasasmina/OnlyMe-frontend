import { useState } from "react";
import { FiCopy, FiEyeOff, FiFlag, FiSlash, FiUser } from "react-icons/fi";
import FanModal from "../fanWeb/shared/FanModal";

const REPORT_REASONS = [
  ["SPAM", "Spam"],
  ["HARASSMENT", "Harassment"],
  ["HATE", "Hate"],
  ["SEXUAL_CONTENT", "Sexual content"],
  ["VIOLENCE", "Violence"],
  ["SCAM", "Scam"],
  ["OTHER", "Other"],
];

function MenuButton({ children, danger = false, icon: Icon, onClick }) {
  return (
    <button className={`discover-more-row ${danger ? "is-danger" : ""}`} onClick={onClick} type="button">
      <span>{Icon ? <Icon aria-hidden="true" /> : null}</span>
      <b>{children}</b>
    </button>
  );
}

function DiscoverMoreMenu({ busy = false, creator, isOpen, onBlock, onClose, onCopyLink, onHide, onReport, onViewProfile }) {
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
    <FanModal className="max-w-md" isOpen={isOpen} onClose={onClose} title={reporting ? "Report creator" : creator?.name || "Discover options"}>
      {reporting ? (
        <form onSubmit={submitReport}>
          <p className="text-xs leading-5 text-atseen-muted">Your report is private and reviewed by moderation.</p>
          <label className="mt-4 block text-xs font-bold text-atseen-muted">
            Reason
            <select className="mt-2 w-full rounded-xl border border-atseen-line bg-atseen-surface-2 px-3 py-3 text-sm text-white outline-none" onChange={(event) => setReason(event.target.value)} value={reason}>
              {REPORT_REASONS.map(([value, label]) => <option className="bg-atseen-bg-2 text-white" key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-xs font-bold text-atseen-muted">
            Additional details
            <textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-atseen-surface-2 p-3 text-sm text-white outline-none" maxLength={1000} onChange={(event) => setDetails(event.target.value)} value={details} />
          </label>
          <div className="mt-5 flex gap-2">
            <button className="flex-1 rounded-full border border-atseen-line py-3 text-sm font-bold" disabled={busy} onClick={() => setReporting(false)} type="button">Back</button>
            <button className="flex-1 rounded-full bg-atseen-danger py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? "Submitting" : "Submit"}</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-1">
          <MenuButton icon={FiUser} onClick={onViewProfile}>View Profile</MenuButton>
          <MenuButton icon={FiCopy} onClick={onCopyLink}>Copy Link</MenuButton>
          <MenuButton icon={FiEyeOff} onClick={onHide}>Not Interested</MenuButton>
          <MenuButton icon={FiFlag} onClick={() => setReporting(true)}>Report</MenuButton>
          <MenuButton danger icon={FiSlash} onClick={onBlock}>Block Account</MenuButton>
        </div>
      )}
    </FanModal>
  );
}

export default DiscoverMoreMenu;
