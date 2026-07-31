import { Link } from "react-router-dom";
import { FiSearch } from "react-icons/fi";

function ExplorePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">Explore Creators</h1>
      <p className="mt-4 max-w-2xl text-brand-mist/80">
        Discovery, ranking, and category experiences can be built here next.
      </p>
      <Link className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-brand-mist hover:border-brand-secondary/50" to="/search">
        <FiSearch aria-hidden="true" />
        Search creators or experiences
      </Link>
    </section>
  );
}

export default ExplorePage;
