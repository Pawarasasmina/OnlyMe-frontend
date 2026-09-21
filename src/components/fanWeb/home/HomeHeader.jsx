import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown, FiGlobe, FiMapPin, FiNavigation, FiSearch, FiStar } from "react-icons/fi";
import { searchService } from "../../../services/searchService";

function cityName(value = "") {
  return String(value || "").split(",")[0].trim();
}

function uniqueCities(items = []) {
  const seen = new Set();
  return items.reduce((cities, item) => {
    const name = cityName(item);
    if (!name || seen.has(name.toLowerCase())) return cities;
    seen.add(name.toLowerCase());
    cities.push({ code: "", label: String(item), name });
    return cities;
  }, []);
}

function HomeHeader({ activityCount = 0, location = "", locationOptions = [], onLocationChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [position, setPosition] = useState(null);
  const [positioning, setPositioning] = useState(false);
  const [sheetPosition, setSheetPosition] = useState({});
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const currentLocation = cityName(location) || "Choose city";
  const suggestedLocations = useMemo(() => uniqueCities(locationOptions).slice(0, 12), [locationOptions]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const center = menuRef.current?.closest(".social-center-scroll");
      const bounds = center?.getBoundingClientRect();
      if (!bounds) return;
      setSheetPosition({
        "--home-location-center-x": `${bounds.left + (bounds.width / 2)}px`,
        "--home-location-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setSearchError("");
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setSearchError("");
      searchService.searchLocations({ q: query, language: navigator.language || "en", latitude: position?.latitude, longitude: position?.longitude }, controller.signal)
        .then(setResults)
        .catch((error) => {
          if (error?.code !== "ERR_CANCELED") setSearchError(error?.response?.data?.message || "Could not search locations.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, position, search]);

  const chooseLocation = (value) => {
    onLocationChange?.(value);
    setOpen(false);
    setSearch("");
  };

  const useCurrentArea = () => {
    if (!navigator.geolocation) {
      setSearchError("Location access is not supported by this browser.");
      return;
    }
    setPositioning(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPosition({ latitude: coords.latitude, longitude: coords.longitude });
      setPositioning(false);
      setSearch((value) => value || "near me");
    }, () => {
      setPositioning(false);
      setSearchError("Allow location access to find your current city.");
    }, { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 });
  };

  return (
    <div className="home-prototype-top">
      <div className="home-location-control" ref={menuRef}>
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          className="home-location-pill"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <FiMapPin aria-hidden="true" />
          <span>{currentLocation}</span>
          <FiChevronDown aria-hidden="true" />
        </button>

        {open ? (
          <div className="home-location-layer" style={sheetPosition}>
            <button aria-label="Close location picker" className="home-location-scrim" onClick={() => setOpen(false)} type="button" />
            <section aria-label="Choose Home location" aria-modal="true" className="home-location-sheet" role="dialog">
            <div className="home-location-sheet-handle" aria-hidden="true" />
            <div className="home-location-sheet-title"><h2>Location</h2></div>
            <p className="home-location-sheet-subtitle">See what&apos;s happening where you are.</p>

            <label className="home-location-search">
              <FiSearch aria-hidden="true" />
              <span className="sr-only">Search locations</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search a country or city"
                ref={inputRef}
                value={search}
              />
            </label>

            <div className="home-location-quick">
              <button
                aria-pressed={!location}
                onClick={() => {
                  chooseLocation("");
                }}
                type="button"
              >
                <FiGlobe aria-hidden="true" />
                Worldwide
              </button>
              <button className={position ? "is-current" : ""} disabled={positioning} onClick={useCurrentArea} type="button"><FiNavigation aria-hidden="true" />{positioning ? "Finding your area…" : "Use my current area"}</button>
            </div>
            <div className="home-location-results">
              {loading ? <p>Searching locations…</p> : null}
              {!loading && searchError ? <p role="alert">{searchError}</p> : null}
              {!loading && !searchError && search.trim().length < 2 ? suggestedLocations.map((item) => <button key={item.label} onClick={() => chooseLocation(item.label)} type="button"><span>{item.code || <FiMapPin />}</span><span><strong>{item.name}</strong><small>{item.label.includes(",") ? item.label.split(",").slice(1).join(",").trim() : "City or country"}</small></span></button>) : null}
              {!loading && !searchError ? results.map((item) => <button aria-pressed={location === item.label} key={`${item.code}-${item.label}`} onClick={() => chooseLocation(item.label)} type="button"><span>{item.code || <FiMapPin />}</span><span><strong>{item.name}</strong>{item.subtitle ? <small>{item.subtitle}</small> : null}</span></button>) : null}
              {!loading && !searchError && search.trim().length >= 2 && !results.length ? <p>No locations found.</p> : null}
            </div>
            </section>
          </div>
        ) : null}
      </div>

      <Link aria-label="Open activity" className="home-spark-button" to="/activity">
        <FiStar aria-hidden="true" />
        {activityCount > 0 ? <span>{activityCount > 9 ? "9+" : activityCount}</span> : null}
      </Link>
    </div>
  );
}

export default HomeHeader;
