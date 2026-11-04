/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function Footer() {
  __useUiLanguage();
  return (
    <footer className="border-t border-white/10 bg-brand-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-brand-mist/70 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>{__msg("layout.onlymeHelpsCreatorsTurnAudienceLoveIntoRecurringIncome")}</p>
        <p>{__msg("layout.starterScaffoldForRapidMernDevelopment")}</p>
      </div>
    </footer>
  );
}

export default Footer;
