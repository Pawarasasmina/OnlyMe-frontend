/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function DiscoverReason({ reason }) {
  __useUiLanguage();
  if (!reason?.detail) return null;
  return (
    <div className="discover-reason">
      <span>{reason.label || __msg("discover.whyYouTwo")}</span>
      <b>{reason.detail}</b>
    </div>
  );
}

export default DiscoverReason;
