/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiClock } from "react-icons/fi";
import FanCard from "../../components/fanWeb/shared/FanCard";

function UnavailableFeaturePage({ description, title }) {
  __useUiLanguage();
  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">{title}</h1>
      <FanCard className="mt-5 text-center">
        <FiClock className="mx-auto h-8 w-8 text-atseen-blue" />
        <h2 className="mt-3 text-base font-bold text-atseen-text">{__msg("social.notAvailableYet")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-atseen-muted">{description}</p>
      </FanCard>
    </div>
  );
}

export default UnavailableFeaturePage;
