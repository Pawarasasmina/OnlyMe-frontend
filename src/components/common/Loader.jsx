import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
function Loader({ label = __msg("admin.loading") }) {
  __useUiLanguage();
  return (
    <div aria-label={label} aria-live="polite" className="flex items-center gap-3 text-sm text-brand-mist/80" role="status">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export default Loader;
