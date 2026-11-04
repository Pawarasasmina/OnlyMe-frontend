/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";

function DiscoverContextStack({ dream, profileRoute, quote }) {
  __useUiLanguage();
  if (!quote && !dream) return null;
  return (
    <div className="discover-context-stack">
      {quote ? <Link className="discover-quote" to={profileRoute}>&quot;{quote}&quot;</Link> : null}
      {dream ? (
        <Link className="discover-dream" to={profileRoute}>
          {dream.emoji ? <span aria-hidden="true">{dream.emoji}</span> : null}
          <span>{__msg("discover.dreamsOf")} <b dir="auto">{dream.title}</b></span>
        </Link>
      ) : null}
    </div>
  );
}

export default DiscoverContextStack;
