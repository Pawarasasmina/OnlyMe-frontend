import { Link } from "react-router-dom";
import { FiCompass, FiEdit3, FiUser } from "react-icons/fi";
import EmptyState from "../fanWeb/shared/EmptyState";

function OrbitEmptyState() {
  return (
    <EmptyState
      icon={FiCompass}
      title="Your Orbit is still forming."
      message="Follow interests, update your location, and interact with creators to improve your recommendations."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Link className="inline-flex items-center gap-2 rounded-xl bg-atseen-blue px-4 py-2.5 text-xs font-bold text-atseen-bg" to="/seen">
            <FiCompass aria-hidden="true" />
            Explore Worlds
          </Link>
          <Link className="inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-2.5 text-xs font-bold text-atseen-text" to="/settings/profile">
            <FiEdit3 aria-hidden="true" />
            Update interests
          </Link>
          <Link className="inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-2.5 text-xs font-bold text-atseen-text" to="/profile">
            <FiUser aria-hidden="true" />
            Complete profile
          </Link>
        </div>
      }
    />
  );
}

export default OrbitEmptyState;
