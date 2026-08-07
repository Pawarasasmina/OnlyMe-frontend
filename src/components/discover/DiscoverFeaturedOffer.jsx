import { Link } from "react-router-dom";
import { compactNumber } from "./discoverFormat";

function priceLabel(offer) {
  if (!offer) return "";
  if (offer.viewerHasAccess) return "Access ready";
  if (offer.isFree) return "Free";
  if (offer.price) return `${offer.price} ${offer.currency || "Stars"}`;
  return "";
}

function DiscoverFeaturedOffer({ offer }) {
  if (!offer) return null;
  return (
    <Link className="discover-offer-card" to={offer.route}>
      <span className="discover-offer-label">{offer.label || "FEATURED WORLD"}</span>
      <b>{offer.title}</b>
      {priceLabel(offer) ? <small>{priceLabel(offer)}</small> : null}
      <span className="discover-offer-cta">{offer.cta || "View World"}</span>
      {offer.peopleCount ? <em>{compactNumber(offer.peopleCount)} stepped inside</em> : null}
    </Link>
  );
}

export default DiscoverFeaturedOffer;
