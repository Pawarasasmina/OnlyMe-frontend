import { useOutletContext } from "react-router-dom";
import OrbitMap from "../../components/fanWeb/orbit/OrbitMap";
import TodayEncounterCard from "../../components/fanWeb/orbit/TodayEncounterCard";
import { useAuth } from "../../hooks/useAuth";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";

function OrbitPage() {
  const { status } = useOutletContext();
  const { user } = useAuth();
  const display = getUserDisplay(user, status);

  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">
        Your Orbit <span className="text-xs font-semibold text-atseen-muted">· {display.location}</span>
      </h1>
      <p className="mt-1.5 text-sm leading-6 text-atseen-muted">
        People drift closer for real reasons — never for follower counts.
      </p>
      <OrbitMap currentUser={display} />
      <TodayEncounterCard />
    </div>
  );
}

export default OrbitPage;
