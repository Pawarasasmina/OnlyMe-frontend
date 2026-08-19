import { FiArrowLeft, FiClock } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function PlanetComingSoonPage() {
  return (
    <div className="grid min-h-[560px] place-items-center px-5 py-12 text-center">
      <section className="w-full max-w-md rounded-3xl border border-atseen-line bg-atseen-surface p-8 shadow-2xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-atseen-blue/10 text-3xl text-atseen-blue"><FiClock /></span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-atseen-blue">Coming soon</p>
        <h1 className="mt-2 text-3xl font-black">Planet creation</h1>
        <p className="mt-3 text-sm leading-6 text-atseen-muted">Creating Worlds and Premium Worlds is not available during the beta. We’re preparing the full planet creation experience for a future release.</p>
        <Link className="mt-7 inline-flex items-center gap-2 rounded-full border border-atseen-line px-5 py-2.5 text-sm font-bold transition hover:border-atseen-blue/50 hover:text-atseen-blue" to="/profile"><FiArrowLeft /> Back to Profile</Link>
      </section>
    </div>
  );
}
