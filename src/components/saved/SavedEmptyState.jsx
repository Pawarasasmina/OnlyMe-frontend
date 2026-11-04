import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function SavedEmptyState({ children }) {
  __useUiLanguage();
  return (
    <div className="saved-empty-state">
      {children}
    </div>
  );
}

export default SavedEmptyState;
