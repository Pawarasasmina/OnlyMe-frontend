import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronDown, FiPlus, FiSearch } from "react-icons/fi";
import AtseenLogo from "../../branding/AtseenLogo";
import WallLocationPicker from "./WallLocationPicker";

function cityName(value = "") {
  return String(value || "").split(",")[0].trim();
}

function HomeHeader({ countryCode = "", location = "", onLocationChange, onNeedOpen }) {
  const pageLocation = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const hasSelectedLocation = Boolean(String(location || "").trim());
  const currentLocation = hasSelectedLocation ? cityName(location) : "Worldwide";

  return (
    <div className="home-prototype-top">
      <div className="home-header-primary">
        <h1 className="wall-page-title">Wall</h1>
        <Link aria-label="Atseen Wall" className="home-mobile-brand" to="/wall">
          <AtseenLogo wordmarkOnly />
        </Link>

        <div className="home-location-control" ref={menuRef}>
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          className="home-location-pill"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {hasSelectedLocation ? <span aria-hidden="true" className="home-location-country-code">{countryCode || "--"}</span> : <span aria-hidden="true" className="wall-location-globe">{"\u{1F30D}"}</span>}
          <span>{currentLocation}</span>
          <FiChevronDown aria-hidden="true" />
        </button>

        {open ? <WallLocationPicker anchorRef={menuRef} location={location} onClose={() => setOpen(false)} onSelect={onLocationChange} /> : null}
        </div>
      </div>

      <div className="home-header-actions">
        <Link aria-label="Search Wall" className="home-spark-button" to="/wall/search" state={{ wallReturnTo: `/wall${pageLocation.search}` }}><FiSearch aria-hidden="true" /></Link>
        {onNeedOpen ? <button aria-label="Create Wall note" className="home-spark-button" onClick={onNeedOpen} type="button"><FiPlus aria-hidden="true" /></button> : null}

      </div>
    </div>
  );
}

export default HomeHeader;
