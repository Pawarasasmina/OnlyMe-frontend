import { FiRefreshCw } from "react-icons/fi";

function DiscoverErrorState({ error, onRetry }) {
  return (
    <section className="discover-state-panel is-error">
      <h1>We could not load Discover.</h1>
      <p>{error?.response?.data?.message || "Check your connection and try again."}</p>
      <div>
        <button onClick={onRetry} type="button"><FiRefreshCw aria-hidden="true" /> Try again</button>
      </div>
    </section>
  );
}

export default DiscoverErrorState;
