/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { compactNumber } from "./discoverFormat";

function priceLabel(offer) {
  if (!offer) return "";
  if (offer.viewerHasAccess) return __msg("discover.accessReady");
  if (offer.isFree) return __msg("profile.free");
  if (offer.price) return `${offer.price} ${offer.currency || __msg("admin.stars")}`;
  return "";
}

function DiscoverFeaturedOffer({ offer }) {
  __useUiLanguage();
  if (!offer) return null;
  return (
    <Link className="discover-offer-card" to={offer.route}>
      <span className="discover-offer-label">{offer.label || __msg("discover.featuredWorld")}</span>
      <b dir="auto">{offer.title}</b>
      {priceLabel(offer) ? <small>{priceLabel(offer)}</small> : null}
      <span className="discover-offer-cta">{offer.cta || __msg("discover.viewWorld")}</span>
      {offer.peopleCount ? <em>{compactNumber(offer.peopleCount)} {__msg("discover.steppedInside")}</em> : null}
    </Link>
  );
}

export default DiscoverFeaturedOffer;
