import { Link } from "react-router-dom";
import { FiRefreshCw, FiSliders } from "react-icons/fi";

function DiscoverEmptyState({ onRefresh, onSettings }) {
  return (
    <section className="discover-state-panel">
      <h1>No new lights yet.</h1>
      <p>Update your interests or discovery settings, then refresh your recommendations.</p>
      <div>
        <button onClick={onSettings} type="button"><FiSliders aria-hidden="true" /> Tune Discover</button>
        <button onClick={onRefresh} type="button"><FiRefreshCw aria-hidden="true" /> Refresh</button>
        <Link to="/seen">Explore Worlds</Link>
      </div>
    </section>
  );
}

export default DiscoverEmptyState;
