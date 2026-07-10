function CreatorDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {["Revenue", "Audience growth", "Scheduled content"].map((card) => (
        <div key={card} className="rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <h2 className="text-lg font-semibold">{card}</h2>
          <p className="mt-2 text-sm text-brand-mist/70">Placeholder analytics card.</p>
        </div>
      ))}
    </div>
  );
}

export default CreatorDashboard;
