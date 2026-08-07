function DiscoverSlideSkeleton() {
  return (
    <div className="discover-person-slide" role="status">
      <div className="discover-skeleton-bg" />
      <div className="discover-shade-top" />
      <div className="discover-shade-bottom" />
      <div className="discover-skeleton-line discover-skeleton-reason" />
      <div className="discover-skeleton-line discover-skeleton-title" />
      <div className="discover-skeleton-identity">
        <span />
        <b />
      </div>
      <div className="discover-skeleton-rail">
        {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
      </div>
      <div className="discover-skeleton-offer" />
      <span className="sr-only">Loading Discover</span>
    </div>
  );
}

export default DiscoverSlideSkeleton;
