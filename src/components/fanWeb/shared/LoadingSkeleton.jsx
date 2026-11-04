/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
function LoadingSkeleton({ count = 3, className = "h-20" }) {
  __useUiLanguage();
  return (
    <div className="space-y-3" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <div className={`${className} animate-pulse rounded-[20px] border border-atseen-line bg-atseen-surface-2`} key={index} />
      ))}
      <span className="sr-only">{__msg("fanWeb.loading")}</span>
    </div>
  );
}

export default LoadingSkeleton;
