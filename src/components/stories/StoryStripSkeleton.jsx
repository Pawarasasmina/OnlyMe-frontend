function SkeletonItem({ labelWidth = 48 }) {
  return (
    <span className="wall-story-skeleton-item" aria-hidden="true">
      <span className="wall-story-skeleton-circle" />
      <span className="wall-story-skeleton-label" style={{ width: labelWidth }} />
      <span className="wall-story-skeleton-sub" />
    </span>
  );
}

function StoryStripSkeleton() {
  return (
    <div aria-label="Loading stories and statuses" className="wall-story-strip wall-story-strip-skeleton" role="status">
      <SkeletonItem labelWidth={42} />
      <SkeletonItem labelWidth={54} />
      {[46, 50, 40, 52, 44, 48].map((width, index) => <SkeletonItem key={`${width}-${index}`} labelWidth={width} />)}
    </div>
  );
}

export default StoryStripSkeleton;

