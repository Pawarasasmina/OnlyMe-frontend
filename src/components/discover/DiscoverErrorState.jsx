/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiRefreshCw } from "react-icons/fi";

function DiscoverErrorState({ error, onRetry }) {
  __useUiLanguage();
  return (
    <section className="discover-state-panel is-error">
      <h1>{__msg("discover.weCouldNotLoadDiscover")}</h1>
      <p>{error?.response?.data?.message || __msg("discover.checkYourConnectionAndTryAgain")}</p>
      <div>
        <button onClick={onRetry} type="button"><FiRefreshCw aria-hidden="true" /> {__msg("discover.tryAgain")}</button>
      </div>
    </section>
  );
}

export default DiscoverErrorState;
