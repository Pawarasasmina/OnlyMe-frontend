import { useEffect, useMemo, useRef } from "react";
import DiscoverEmptyState from "./DiscoverEmptyState";
import DiscoverErrorState from "./DiscoverErrorState";
import DiscoverFilterPills from "./DiscoverFilterPills";
import DiscoverPersonSlide from "./DiscoverPersonSlide";
import DiscoverSlideSkeleton from "./DiscoverSlideSkeleton";

function preloadMedia(slide) {
  if (!slide?.media?.url || slide.media.type === "video") return;
  const image = new Image();
  image.src = slide.media.url;
}

function DiscoverViewport({
  activeFilter,
  activeIndex,
  error,
  filters,
  hasNextPage,
  isError,
  isFetching,
  isFetchingNextPage,
  isLoading,
  onActiveIndex,
  onFilterChange,
  onMessage,
  onMore,
  onRefresh,
  onSave,
  onSeeYou,
  onSettings,
  onShare,
  pending,
  fetchNextPage,
  slides,
}) {
  const scrollerRef = useRef(null);
  const slideRefs = useRef([]);
  const visibleSlides = useMemo(() => slides.filter(Boolean), [slides]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!active) return;
      const index = Number(active.target.getAttribute("data-index"));
      if (Number.isFinite(index)) onActiveIndex(index);
    }, { root: scroller, threshold: [0.62, 0.74] });
    slideRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [onActiveIndex, visibleSlides.length]);

  useEffect(() => {
    preloadMedia(visibleSlides[activeIndex + 1]);
    if (hasNextPage && !isFetchingNextPage && activeIndex >= visibleSlides.length - 3) {
      fetchNextPage();
    }
  }, [activeIndex, fetchNextPage, hasNextPage, isFetchingNextPage, visibleSlides]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeFilter]);

  const move = (direction) => {
    const next = Math.min(Math.max(activeIndex + direction, 0), visibleSlides.length - 1);
    slideRefs.current[next]?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const onKeyDown = (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    if (["input", "textarea", "select", "button", "a"].includes(tag)) return;
    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      move(1);
    }
    if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <section className="discover-immersive" onKeyDown={onKeyDown}>
      <DiscoverFilterPills
        active={activeFilter}
        filters={filters}
        isFetching={isFetching}
        onChange={onFilterChange}
        onRefresh={onRefresh}
        onSettings={onSettings}
      />
      <div className="discover-snap-container atseen-hide-scrollbar" ref={scrollerRef} tabIndex={0}>
        {isLoading ? <DiscoverSlideSkeleton /> : null}
        {!isLoading && isError ? <DiscoverErrorState error={error} onRetry={onRefresh} /> : null}
        {!isLoading && !isError && !visibleSlides.length ? <DiscoverEmptyState onRefresh={onRefresh} onSettings={onSettings} /> : null}
        {!isLoading && !isError ? visibleSlides.map((slide, index) => (
          <div className="discover-slide-frame" data-index={index} key={slide.id} ref={(node) => { slideRefs.current[index] = node; }}>
            <DiscoverPersonSlide
              active={index === activeIndex}
              onMessage={() => onMessage(slide)}
              onMore={() => onMore(slide)}
              onSave={() => onSave(slide)}
              onSeeYou={() => onSeeYou(slide)}
              onShare={() => onShare(slide)}
              pending={pending}
              slide={slide}
            />
          </div>
        )) : null}
        {isFetchingNextPage ? <div className="discover-next-loader"><span /> Loading more</div> : null}
        {!hasNextPage && visibleSlides.length ? <div className="discover-end-slide"><b>You are caught up.</b><button onClick={onRefresh} type="button">Refresh lights</button></div> : null}
      </div>
    </section>
  );
}

export default DiscoverViewport;
