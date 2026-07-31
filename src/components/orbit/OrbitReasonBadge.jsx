function OrbitReasonBadge({ reason }) {
  if (!reason) return null;

  return (
    <span className="inline-flex rounded-full border border-atseen-blue/25 bg-atseen-blue/10 px-3 py-1 text-[11px] font-bold text-atseen-blue">
      {reason}
    </span>
  );
}

export default OrbitReasonBadge;
