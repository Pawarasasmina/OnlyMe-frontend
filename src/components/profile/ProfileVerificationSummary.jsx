import { Link } from "react-router-dom";
import { FiCheckCircle, FiClock } from "react-icons/fi";
import FanCard from "../fanWeb/shared/FanCard";

function ProfileVerificationSummary({ profile, capabilities }) {
  if (!capabilities.isOwner || profile.role !== "creator") return null;
  const approved = profile.creatorApprovalStatus === "approved";
  return <FanCard className="mt-4 flex items-center gap-3"><span className={`rounded-xl p-3 ${approved ? "bg-atseen-success/10 text-atseen-success" : "bg-atseen-warning/10 text-atseen-warning"}`}>{approved ? <FiCheckCircle /> : <FiClock />}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{approved ? "Creator approved" : "Creator verification pending"}</p><p className="mt-1 text-xs text-atseen-muted">Verification status: {profile.creatorVerificationStatus || "not submitted"}</p></div><Link className="text-xs font-bold text-atseen-blue" to="/creator/verification">Open verification</Link></FanCard>;
}

export default ProfileVerificationSummary;
