import { Link } from "react-router-dom";
import { FiMapPin, FiSettings, FiSliders } from "react-icons/fi";
import FanModal from "../fanWeb/shared/FanModal";
import OrbitReasonBadge from "./OrbitReasonBadge";
import { formatOrbitLocation } from "./orbitFormat";

function OrbitTunePanel({ currentUser, isOpen, onClose }) {
  const location = formatOrbitLocation(currentUser?.location) || currentUser?.locationLabel || currentUser?.city || "";
  const interests = currentUser?.interests || currentUser?.sharedInterests || [];

  return (
    <FanModal isOpen={isOpen} onClose={onClose} title="Tune your Orbit">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-atseen-muted">
          Every person here is chosen from approved discovery inputs and how you use Atseen.
        </p>
        <p className="rounded-2xl border border-atseen-blue/20 bg-atseen-blue/10 p-4 text-xs leading-5 text-atseen-muted">
          Your orbit only ever shows public ties and open discovery signals. Messages and private signals never appear to others.
        </p>
        <div className="rounded-2xl border border-atseen-line bg-atseen-surface p-4">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">
            <FiMapPin aria-hidden="true" className="text-atseen-blue" />
            Location
          </p>
          <p className="mt-2 text-sm font-semibold text-atseen-text">{location || "Add a city to improve nearby resonance."}</p>
        </div>
        <div className="rounded-2xl border border-atseen-line bg-atseen-surface p-4">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">
            <FiSliders aria-hidden="true" className="text-atseen-blue" />
            Interests
          </p>
          {interests.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {interests.map((interest) => <OrbitReasonBadge key={interest} reason={interest} />)}
            </div>
          ) : (
            <p className="mt-2 text-sm text-atseen-muted">Add interests so stronger matches can drift closer.</p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Link className="rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-center text-sm font-semibold text-atseen-text transition hover:border-atseen-blue/50" to="/settings/profile">
            Update profile
          </Link>
          <Link className="rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-center text-sm font-semibold text-atseen-text transition hover:border-atseen-blue/50" to="/settings/profile">
            Update interests
          </Link>
          <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-atseen-blue px-4 py-3 text-sm font-extrabold text-atseen-bg" to="/settings/privacy">
            <FiSettings aria-hidden="true" />
            Preferences
          </Link>
        </div>
      </div>
    </FanModal>
  );
}

export default OrbitTunePanel;
