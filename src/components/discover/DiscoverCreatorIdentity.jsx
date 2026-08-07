import { Link } from "react-router-dom";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";

function locationLabel(location = {}) {
  return [location.city, location.country].filter(Boolean).join(", ");
}

function DiscoverCreatorIdentity({ creator }) {
  const place = locationLabel(creator.location);
  return (
    <Link aria-label={`View ${creator.name}`} className="discover-identity" to={creator.profileRoute}>
      <FanAvatar className="discover-identity-avatar" name={creator.name} size="h-11 w-11" src={creator.avatar} />
      <span className="min-w-0">
        <h2>
          <span>{creator.name}</span>
          {creator.verified ? <VerifiedBadge /> : null}
        </h2>
        <small>{[creator.status, place, creator.category].filter(Boolean).join(" · ")}</small>
      </span>
    </Link>
  );
}

export default DiscoverCreatorIdentity;
