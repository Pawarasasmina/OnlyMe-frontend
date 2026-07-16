function ProgressBar({ className = "", label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={pct}
      className={`h-1.5 overflow-hidden rounded-full bg-white/[0.07] ${className}`}
      role="progressbar"
    >
      <span
        className="block h-full rounded-full bg-gradient-to-r from-atseen-blue to-atseen-blue-strong"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default ProgressBar;
