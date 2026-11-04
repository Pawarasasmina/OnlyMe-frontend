/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { FiCompass, FiEdit3, FiUser } from "react-icons/fi";
import EmptyState from "../fanWeb/shared/EmptyState";

function OrbitEmptyState() {
  __useUiLanguage();
  return (
    <EmptyState
      icon={FiCompass}
      title={__msg("orbit.yourOrbitIsStillForming")}
      message={__msg("orbit.followInterestsUpdateYourLocationAndInteractWithCreators")}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Link className="inline-flex items-center gap-2 rounded-xl bg-atseen-blue px-4 py-2.5 text-xs font-bold text-atseen-bg" to="/seen">
            <FiCompass aria-hidden="true" />{__msg("discover.exploreWorlds")}</Link>
          <Link className="inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-2.5 text-xs font-bold text-atseen-text" to="/settings/profile">
            <FiEdit3 aria-hidden="true" />{__msg("discover.updateInterests")}</Link>
          <Link className="inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-2.5 text-xs font-bold text-atseen-text" to="/profile">
            <FiUser aria-hidden="true" />{__msg("orbit.completeProfile")}</Link>
        </div>
      }
    />
  );
}

export default OrbitEmptyState;
