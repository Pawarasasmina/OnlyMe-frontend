import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown, FiGlobe, FiMapPin, FiSearch, FiStar } from "react-icons/fi";

const LIVE_CITY_FALLBACKS = [
  { code: "AE", name: "Dubai" },
  { code: "AE", name: "Abu Dhabi" },
];

const CITY_CODES = {
  "abu dhabi": "AE",
  bali: "ID",
  bangkok: "TH",
  barcelona: "ES",
  berlin: "DE",
  dubai: "AE",
  london: "GB",
  milan: "IT",
  paris: "FR",
  tokyo: "JP",
  warsaw: "PL",
  zurich: "CH",
};

const COUNTRY_NAMES = {
  AE: "UAE",
  ES: "Spain",
  FR: "France",
  GB: "UK",
  ID: "Indonesia",
  IT: "Italy",
  JP: "Japan",
  PL: "Poland",
  TH: "Thailand",
  CH: "Switzerland",
};

const COMING_SOON_CITIES = [
  { code: "GB", goal: 4000, name: "London", waiting: 3021 },
  { code: "FR", goal: 2000, name: "Paris", waiting: 1873 },
  { code: "DE", goal: 2000, name: "Berlin", waiting: 1445 },
  { code: "CH", goal: 1000, name: "Zurich", waiting: 960 },
  { code: "IT", goal: 3000, name: "Milan", waiting: 2140 },
  { code: "PL", goal: 1000, name: "Warsaw", waiting: 784 },
  { code: "ES", goal: 2000, name: "Barcelona", waiting: 1105 },
  { code: "TH", goal: 2000, name: "Bangkok", waiting: 1310 },
  { code: "ID", goal: 1000, name: "Bali", waiting: 512 },
  { code: "JP", goal: 2000, name: "Tokyo", waiting: 1204 },
];

function cityName(value = "") {
  return String(value || "").split(",")[0].trim();
}

function cityCode(name = "") {
  return CITY_CODES[cityName(name).toLowerCase()] || "AE";
}

function countryName(name = "") {
  return COUNTRY_NAMES[cityCode(name)] || "UAE";
}

function uniqueCities(items = []) {
  const seen = new Set();
  return items.reduce((cities, item) => {
    const name = cityName(item);
    if (!name || seen.has(name.toLowerCase())) return cities;
    seen.add(name.toLowerCase());
    cities.push({ code: cityCode(name), name });
    return cities;
  }, []);
}

function HomeHeader({ activityCount = 0, location = "", locationOptions = [], onLocationChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [joinedCities, setJoinedCities] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("atseen_home_city_waitlist") || "{}");
    } catch {
      return {};
    }
  });
  const menuRef = useRef(null);
  const currentLocation = cityName(location) || "Choose city";
  const liveCities = useMemo(() => {
    const configured = uniqueCities(locationOptions);
    const merged = [...LIVE_CITY_FALLBACKS, ...configured];
    const seen = new Set();
    return merged.filter((city) => {
      const key = city.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [locationOptions]);
  const searchedCities = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return liveCities;
    return liveCities.filter((city) => city.name.toLowerCase().includes(term) || city.code.toLowerCase().includes(term));
  }, [liveCities, search]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const joinCity = (name) => {
    setJoinedCities((current) => {
      const next = { ...current, [name]: true };
      if (typeof window !== "undefined") {
        localStorage.setItem("atseen_home_city_waitlist", JSON.stringify(next));
      }
      return next;
    });
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
          <div aria-label="Choose Home city" className="home-location-sheet" role="dialog">
            <div className="home-location-sheet-handle" aria-hidden="true" />
            <div className="home-location-sheet-title">
              <FiGlobe aria-hidden="true" />
              <h2>Where do you want the latest from?</h2>
            </div>
            <p className="home-location-sheet-subtitle">Choose a city, country, or go worldwide.</p>

            <label className="home-location-search">
              <FiSearch aria-hidden="true" />
              <span className="sr-only">Search locations</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cities"
                value={search}
              />
            </label>

            <div className="home-location-quick">
              <button
                aria-pressed={!location}
                onClick={() => {
                  onLocationChange?.("");
                  setOpen(false);
                }}
                type="button"
              >
                <FiGlobe aria-hidden="true" />
                Worldwide
              </button>
              {location ? (
                <button
                  onClick={() => {
                    onLocationChange?.(cityName(location));
                    setOpen(false);
                  }}
                  type="button"
                >
                  <FiMapPin aria-hidden="true" />
                  Current city
                </button>
              ) : null}
              {location && cityCode(location) ? (
                <button
                  onClick={() => {
                    onLocationChange?.(countryName(location));
                    setOpen(false);
                  }}
                  type="button"
                >
                  {countryName(location)}
                  Country
                </button>
              ) : null}
            </div>

            <div className="home-location-group-label">
              <span>Live now</span>
              <i aria-hidden="true" />
            </div>
            <div className="home-location-grid">
              {searchedCities.map((city) => (
                <button
                  aria-pressed={city.name === currentLocation}
                  className="home-city-card is-live"
                  key={city.name}
                  onClick={() => {
                    onLocationChange?.(city.name);
                    setOpen(false);
                  }}
                  type="button"
                >
                  <span className="home-city-code">{city.code}</span>
                  <strong>{city.name}</strong>
                  <span className="home-city-live-dot" aria-hidden="true" />
                </button>
              ))}
              {!searchedCities.length ? <p className="home-location-no-results">No matching live city yet.</p> : null}
            </div>

            <div className="home-location-group-label is-soon">
              <span>Coming soon</span>
              <strong aria-hidden="true">*</strong>
            </div>
            <div className="home-location-grid">
              {COMING_SOON_CITIES.map((city) => {
                const joined = Boolean(joinedCities[city.name]);
                const waiting = city.waiting + (joined ? 1 : 0);
                const progress = Math.max(4, Math.min(100, Math.round((waiting / city.goal) * 100)));
                return (
                  <button
                    aria-pressed={joined}
                    className={`home-city-card is-coming ${joined ? "is-joined" : ""}`}
                    key={city.name}
                    onClick={() => joinCity(city.name)}
                    type="button"
                  >
                    <span className="home-city-heading">
                      <span className="home-city-code">{city.code}</span>
                      <strong>{city.name}</strong>
                    </span>
                    <span className="home-city-waiting">{joined ? "You are in line" : `${waiting.toLocaleString()} waiting`}</span>
                    <span className="home-city-progress" aria-hidden="true">
                      <span style={{ width: `${progress}%` }} />
                    </span>
                    <span className="home-city-goal">
                      {waiting.toLocaleString()} / {city.goal.toLocaleString()} to light it up *
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="home-city-footnote">Your queue decides where we go next *</p>
            <div className="home-location-sheet-actions">
              <button
                onClick={() => {
                  onLocationChange?.("");
                  setOpen(false);
                }}
                type="button"
              >
                Show all cities
              </button>
            </div>
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
