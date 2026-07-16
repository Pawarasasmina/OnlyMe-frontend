function HomeHeader({ location = "Dubai" }) {
  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">Home</h1>
        <span className="text-[11.5px] text-atseen-muted">
          {location} <span className="text-atseen-blue">{"\u2022"}</span>
        </span>
      </div>
      <p className="mt-1 text-[11px] text-atseen-dim">Notes, questions and useful sightings from your orbit.</p>
    </div>
  );
}

export default HomeHeader;
