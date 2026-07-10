import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiArrowRight, FiDollarSign, FiUsers, FiVideo } from "react-icons/fi";
import Button from "../../components/common/Button";
import { formatCurrency } from "../../utils/formatCurrency";

const stats = [
  { label: "Monthly creator payouts", value: formatCurrency(2800000) },
  { label: "Active fan communities", value: "1,200+" },
  { label: "Premium drops launched", value: "35k+" },
];

const features = [
  { icon: FiDollarSign, title: "Monetize directly", text: "Subscriptions, exclusive drops, and premium moments all live in one platform." },
  { icon: FiUsers, title: "Own your audience", text: "Build relationships with fans through gated experiences and direct messaging." },
  { icon: FiVideo, title: "Ship content faster", text: "Manage creator assets, previews, and campaigns from one studio workflow." },
];

function HomePage() {
  return (
    <div className="bg-hero">
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-4 inline-flex rounded-full border border-brand-secondary/30 bg-brand-secondary/10 px-4 py-2 text-sm text-brand-secondary">
              Creator monetization, reimagined
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-tight sm:text-6xl">
              Build a membership platform fans actually want to stay inside.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-brand-mist/80">
              OnlyMe gives creators a polished home for premium communities, exclusive content, and recurring revenue.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register">
                <Button className="gap-2">
                  Start as a creator <FiArrowRight />
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="secondary">Explore creators</Button>
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mt-2 text-sm text-brand-mist/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="rounded-[1.5rem] bg-gradient-to-br from-brand-primary to-brand-secondary p-8 text-brand-dark">
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">Studio snapshot</p>
              <h2 className="mt-3 text-3xl font-black">Trending this week</h2>
              <p className="mt-4 text-sm font-medium">Revenue, community growth, and scheduled content all in one creator dashboard.</p>
            </div>
            <div className="mt-6 grid gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4 rounded-3xl border border-white/10 bg-brand-dark/60 p-4">
                  <feature.icon className="mt-1 text-xl text-brand-secondary" />
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-brand-mist/70">{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
