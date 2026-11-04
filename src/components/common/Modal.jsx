/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function Modal({ isOpen, title, children, onClose }) {
  __useUiLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-brand-slate p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-sm text-brand-mist/80" onClick={onClose} type="button">{__msg("activity.close")}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
