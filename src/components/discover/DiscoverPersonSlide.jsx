import { memo } from "react";
import DiscoverActionRail from "./DiscoverActionRail";
import DiscoverContextStack from "./DiscoverContextStack";
import DiscoverCreatorIdentity from "./DiscoverCreatorIdentity";
import DiscoverFeaturedOffer from "./DiscoverFeaturedOffer";
import DiscoverMediaBackground from "./DiscoverMediaBackground";
import DiscoverReason from "./DiscoverReason";

function DiscoverPersonSlide({
  active = false,
  onMessage,
  onMore,
  onSave,
  onSeeYou,
  onShare,
  pending,
  slide,
}) {
  const creator = slide.creator;
  return (
    <article aria-label={`${creator.name} recommendation`} className="discover-person-slide" data-active={active ? "true" : "false"}>
      <DiscoverMediaBackground active={active} creatorName={creator.name} media={slide.media} />
      <div aria-hidden="true" className="discover-shade-top" />
      <div aria-hidden="true" className="discover-shade-bottom" />
      <DiscoverReason reason={slide.reason} />
      <DiscoverCreatorIdentity creator={creator} />
      <DiscoverContextStack dream={slide.dream} profileRoute={creator.profileRoute} quote={slide.quote} />
      <DiscoverActionRail
        actions={slide.actions}
        creatorName={creator.name}
        onMessage={onMessage}
        onMore={onMore}
        onSave={onSave}
        onSeeYou={onSeeYou}
        onShare={onShare}
        pending={pending}
      />
      <DiscoverFeaturedOffer offer={slide.featuredOffer} />
    </article>
  );
}

export default memo(DiscoverPersonSlide);
