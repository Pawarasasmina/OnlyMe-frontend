import { Link } from "react-router-dom";
import { FiChevronRight, FiTag, FiPhone } from "react-icons/fi";
import { msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import "./BusinessTools.css";

export default function BusinessTools() {
  useLanguage();
  return <section className="business-dashboard-tools" aria-label={msg("settings.offers")}>
    <h2>{msg("settings.offers")}</h2>
    <p>{msg("settings.contactButtonsAndOffersOnTheWall")}</p>
    <Link to="/wall?compose=note&composeType=Offering"><FiTag aria-hidden="true" /><span>{msg("fanWeb.offering")}</span><FiChevronRight aria-hidden="true" /></Link>
    <Link to="/settings/profile?from=profile"><FiPhone aria-hidden="true" /><span>{msg("profile.businessContactTitle")}</span><FiChevronRight aria-hidden="true" /></Link>
  </section>;
}
