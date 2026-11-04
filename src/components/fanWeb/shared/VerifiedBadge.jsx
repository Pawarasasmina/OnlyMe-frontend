/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { FiCheck } from "react-icons/fi";

function VerifiedBadge({ className = "", variant = "default", onClick }) {
  __useUiLanguage();
  if (variant === "profile") {
    const seal = Array.from({ length: 24 }, (_, index) => {
      const angle = Math.PI * index / 12 - Math.PI / 2;
      const radius = index % 2 ? 9.03 : 10.5;
      return `${index ? "L" : "M"}${(12 + Math.cos(angle) * radius).toFixed(1)} ${(12 + Math.sin(angle) * radius).toFixed(1)}`;
    }).join("") + "Z";
    const Element = onClick ? "button" : "span";
    return <Element aria-label={onClick ? __msg("fanWeb.viewVerificationDetails") : __msg("fanWeb.verified")} className={`profile-verified-seal ${className}`} onClick={onClick} title={__msg("fanWeb.verified")} type={onClick ? "button" : undefined}><svg aria-hidden="true" fill="none" height="18" shapeRendering="geometricPrecision" viewBox="0 0 24 24" width="18"><path d={seal} fill="#9CCBFF" stroke="#FFFFFF" strokeWidth="1" /><path d="m8.22 12.21 2.52 2.625 5.04-5.25" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg></Element>;
  }
  return (
    <span
      aria-label={__msg("fanWeb.verified")}
      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-atseen-blue text-[9px] text-atseen-bg ${className}`}
      title={__msg("fanWeb.verified")}
    >
      <FiCheck aria-hidden="true" strokeWidth={3} />
    </span>
  );
}

export default VerifiedBadge;
