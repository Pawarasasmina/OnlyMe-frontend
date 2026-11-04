/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function ExplorePage() {
  __useUiLanguage();
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">{__msg("public.exploreCreators")}</h1>
      <p className="mt-4 max-w-2xl text-brand-mist/80">{__msg("public.discoveryRankingAndCategoryExperiencesCanBeBuiltHere")}</p>
    </section>
  );
}

export default ExplorePage;
