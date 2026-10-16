function SkeletonLine({ className = "" }) {
  return <span aria-hidden="true" className={`wall-feed-skeleton__line ${className}`} />;
}

function WallFeedSkeleton() {
  return (
    <div aria-label="Loading Wall posts" className="wall-feed-skeleton" role="status">
      {["media", "text"].map((kind) => (
        <article className="wall-feed-skeleton__post" key={kind}>
          <header className="wall-feed-skeleton__head">
            <span aria-hidden="true" className="wall-feed-skeleton__avatar" />
            <span className="wall-feed-skeleton__identity">
              <SkeletonLine className="is-name" />
              <SkeletonLine className="is-meta" />
            </span>
            <SkeletonLine className="is-chip" />
          </header>
          <div className="wall-feed-skeleton__copy">
            <SkeletonLine />
            <SkeletonLine className="is-short" />
          </div>
          {kind === "media" ? <div aria-hidden="true" className="wall-feed-skeleton__media" /> : null}
          <footer className="wall-feed-skeleton__actions" aria-hidden="true">
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine />
          </footer>
        </article>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default WallFeedSkeleton;
