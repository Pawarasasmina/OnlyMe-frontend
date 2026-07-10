import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiArrowRight, FiLock, FiUsers } from "react-icons/fi";
import { sampleCreators } from "../../data/sampleCreators";

function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-secondary">Discover creators</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Find your new favorite.</h1>
          <p className="mt-3 max-w-xl text-brand-mist/70">Browse our featured creators. Sign in as a fan to open profiles and see their exclusive world.</p>
        </div>
        <Link className="inline-flex items-center gap-2 font-semibold text-brand-secondary" to="/register?role=creator">
          Become a creator <FiArrowRight />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sampleCreators.map((creator, index) => (
          <motion.article
            key={creator.username}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-white/20"
          >
            <div className={`flex h-52 items-center justify-center bg-gradient-to-br ${creator.accent}`}>
              <span className="text-6xl font-black text-white/90 drop-shadow-lg">{creator.initials}</span>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-secondary">{creator.category}</p>
                  <h2 className="mt-2 text-2xl font-bold">{creator.name}</h2>
                  <p className="mt-1 text-sm text-brand-mist/55">@{creator.username}</p>
                </div>
                <FiLock className="mt-1 text-brand-mist/40" />
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-brand-mist/70">{creator.bio}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="inline-flex items-center gap-2 text-sm text-brand-mist/60"><FiUsers /> {creator.members} fans</span>
                <Link className="font-semibold text-brand-primary" to={`/creators/${creator.username}`}>View creator</Link>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </main>
  );
}

export default HomePage;
