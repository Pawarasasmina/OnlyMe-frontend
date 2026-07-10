function FanDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
        <h2 className="text-xl font-semibold">Following</h2>
        <p className="mt-2 text-brand-mist/70">Track active subscriptions and favorite creators here.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
        <h2 className="text-xl font-semibold">Recent unlocks</h2>
        <p className="mt-2 text-brand-mist/70">Premium content history and saved drops will live here.</p>
      </div>
    </div>
  );
}

export default FanDashboard;
