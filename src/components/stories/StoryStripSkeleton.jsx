/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function SkeletonItem({ labelWidth = 48 }) {
  __useUiLanguage();
  return (
    <span className="wall-story-skeleton-item" aria-hidden="true">
      <span className="wall-story-skeleton-circle" />
      <span className="wall-story-skeleton-label" style={{ width: labelWidth }} />
      <span className="wall-story-skeleton-sub" />
    </span>
  );
}

function StoryStripSkeleton() {
  __useUiLanguage();
  return (
    <div aria-label={__msg("stories.loadingStoriesAndStatuses")} className="wall-story-strip wall-story-strip-skeleton" role="status">
      <SkeletonItem labelWidth={42} />
      <SkeletonItem labelWidth={54} />
      {[46, 50, 40, 52, 44, 48].map((width, index) => <SkeletonItem key={`${width}-${index}`} labelWidth={width} />)}
    </div>
  );
}

export default StoryStripSkeleton;

