import { Link } from "react-router-dom";

function SavedCategoryCard({ count = 0, full = false, icon: Icon, loading = false, subtitle, title, to }) {
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
      aria-label={`Open saved ${title.toLowerCase()}`}
      className={`saved-category-card ${full ? "is-full" : ""}`}
      to={to}
    >
      {content}
    </Link>
  );
}

export default SavedCategoryCard;
