import { FiArrowLeft, FiCheck, FiClock } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function ComingSoonOverlay({ description, highlights = [], icon = "✦", title }) {
  return (
    <main className="coming-soon-page">
      <div className="coming-soon-glow" aria-hidden="true" />
      <section className="coming-soon-card" role="status">
        <span className="coming-soon-icon" aria-hidden="true">{icon}</span>
        <span className="coming-soon-kicker"><FiClock /> Coming soon</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {highlights.length ? <div className="coming-soon-highlights">{highlights.map((item) => <span key={item}><FiCheck /> {item}</span>)}</div> : null}
        <Link className="coming-soon-back" to="/profile"><FiArrowLeft /> Back to profile</Link>
        <small>We’re building this carefully for the full @seen experience.</small>
      </section>
    </main>
  );
}
