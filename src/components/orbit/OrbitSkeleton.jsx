import OrbitRings from "./OrbitRings";

const skeletonPositions = [
  { x: 50, y: 18 },
  { x: 75, y: 32 },
  { x: 72, y: 72 },
  { x: 28, y: 70 },
  { x: 22, y: 38 },
];

function OrbitSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-40 rounded-full bg-atseen-surface-2" />
      <div className="mt-3 h-4 w-72 max-w-full rounded-full bg-atseen-surface-2" />
      <div className="relative mt-[18px] h-[360px] overflow-hidden rounded-[22px] border border-atseen-line bg-[radial-gradient(80%_90%_at_50%_45%,#0d1420,#06080B_75%)] sm:h-[400px]">
        <OrbitRings />
        <span className="absolute left-1/2 top-1/2 h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-atseen-blue/15 shadow-glow" />
        {skeletonPositions.map((position) => (
          <span
            className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-atseen-surface-2"
            key={`${position.x}-${position.y}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          />
        ))}
      </div>
      <div className="mt-6 h-28 rounded-[20px] border border-atseen-line bg-atseen-surface" />
    </div>
  );
}

export default OrbitSkeleton;
