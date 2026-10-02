export default function ActivitySparkMark({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`activity-spark-mark ${className}`.trim()}
      viewBox="0 0 64 64"
    >
      <defs>
        <radialGradient id="activitySparkGradient" fx="38%" fy="30%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#CFE7FF" />
          <stop offset="100%" stopColor="#5E8FCC" />
        </radialGradient>
      </defs>
      <path d="M32 5l5.5 19.5L57 30l-19.5 5.5L32 55l-5.5-19.5L7 30l19.5-5.5z" fill="url(#activitySparkGradient)" />
      <path d="M32 5l5.5 19.5L57 30l-25-2z" fill="#FFFFFF" opacity=".5" />
      <path d="M32 55l-5.5-19.5L7 30l25 2z" fill="#3E639C" opacity=".45" />
    </svg>
  );
}
