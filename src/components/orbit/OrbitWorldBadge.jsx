import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiLayers } from "react-icons/fi";

function OrbitWorldBadge({ badge }) {
  __useUiLanguage();
  if (!badge?.label) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-atseen-line bg-atseen-surface-2 px-2.5 py-1 text-[10px] font-bold text-atseen-muted" title={badge.label}>
      {badge.emoji ? <span aria-hidden="true">{badge.emoji}</span> : <FiLayers aria-hidden="true" className="text-atseen-blue" />}
      {badge.label}
    </span>
  );
}

export default OrbitWorldBadge;
