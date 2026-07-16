import { FiCheck } from "react-icons/fi";

function VerifiedBadge({ className = "" }) {
  return (
    <span
      aria-label="Verified"
      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-atseen-blue text-[9px] text-atseen-bg ${className}`}
      title="Verified"
    >
      <FiCheck aria-hidden="true" strokeWidth={3} />
    </span>
  );
}

export default VerifiedBadge;
