/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";

function SavedCategoryCard({ count = 0, full = false, icon: Icon, loading = false, subtitle, title, to }) {
  __useUiLanguage();
  const content = (
    <>
      <span className="saved-category-icon" aria-hidden="true">
        {Icon ? <Icon /> : null}
      </span>
      <span className="saved-category-copy">
        <strong>{title}</strong>
        {loading ? <span className="saved-category-count is-loading" /> : <span>{subtitle ?? count}</span>}
      </span>
    </>
  );

  return (
    <Link
      aria-label={__msg("saved.openSaved", { value0: title.toLowerCase() })}
      className={`saved-category-card ${full ? "is-full" : ""}`}
      to={to}
    >
      {content}
    </Link>
  );
}

export default SavedCategoryCard;
