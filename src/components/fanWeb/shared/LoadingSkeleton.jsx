function LoadingSkeleton({ count = 3, className = "h-20" }) {
  return (
    <div className="space-y-3" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <div className={`${className} animate-pulse rounded-[20px] border border-atseen-line bg-atseen-surface-2`} key={index} />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default LoadingSkeleton;
