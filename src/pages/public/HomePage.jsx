import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiArrowRight, FiLock, FiUsers } from "react-icons/fi";
import { creatorService } from "../../services/creatorService";

const accents = [
  "from-rose-500 via-orange-400 to-amber-300",
  "from-sky-500 via-indigo-500 to-violet-500",
  "from-fuchsia-500 via-pink-500 to-rose-400",
  "from-emerald-500 via-teal-400 to-cyan-300",
  "from-violet-600 via-purple-500 to-pink-400",
  "from-amber-400 via-orange-500 to-red-500",
];

const initials = (name = "Creator") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function HomePage() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    creatorService.getCreators()
      .then((response) => setCreators(response.data.data.creators || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load creators"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-secondary">Discover creators</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Find your new favorite.</h1>
          <p className="mt-3 max-w-xl text-brand-mist/70">Browse creators on OnlyMe and discover their exclusive content.</p>
        </div>
        <Link className="inline-flex items-center gap-2 font-semibold text-brand-secondary" to="/register?role=creator">Become a creator <FiArrowRight /></Link>
      </div>

      {loading && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div className="h-[430px] animate-pulse rounded-[2rem] border border-white/10 bg-white/5" key={item} />)}</div>}
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-200">{error}</div>}
      {!loading && !error && creators.length === 0 && <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center"><h2 className="text-xl font-bold">No creators yet</h2><p className="mt-2 text-sm text-brand-mist/55">Registered creator accounts will appear here automatically.</p></div>}

      {!loading && !error && creators.length > 0 && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((creator, index) => (
          <motion.article key={creator.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-white/20">
            <div className={`flex h-52 items-center justify-center bg-gradient-to-br ${accents[index % accents.length]}`}>
              {creator.avatar ? <img alt={creator.name} className="h-full w-full object-cover" src={creator.avatar} /> : <span className="text-6xl font-black text-white/90 drop-shadow-lg">{initials(creator.name)}</span>}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-brand-secondary">{creator.category}</p><h2 className="mt-2 text-2xl font-bold">{creator.name}</h2><p className="mt-1 text-sm text-brand-mist/55">@{creator.username}</p></div><FiLock className="mt-1 text-brand-mist/40" /></div>
              <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-brand-mist/70">{creator.bio || "This creator is getting their profile ready."}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5"><span className="inline-flex items-center gap-2 text-sm text-brand-mist/60"><FiUsers /> {creator.members} fans</span><Link className="font-semibold text-brand-primary" to={`/creators/${creator.username}`}>View creator</Link></div>
            </div>
          </motion.article>
        ))}
      </div>}
    </main>
  );
}

export default HomePage;
