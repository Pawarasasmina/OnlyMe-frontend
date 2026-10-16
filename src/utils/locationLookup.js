export function canLookupLocation(search, position) {
  const query = String(search || "").trim();
  const validPosition = Number.isFinite(position?.latitude) && Math.abs(position.latitude) <= 90 && Number.isFinite(position?.longitude) && Math.abs(position.longitude) <= 180;
  return query.length >= 2 || (!query && validPosition);
}

export function geolocationErrorMessage(error) {
  if (error?.code === 1) return "Location permission is blocked. Allow location access for this site in your browser, or search for your city.";
  if (error?.code === 3) return "Finding your location timed out. Try again, or search for your city.";
  return "Your device could not determine your location. Try again, or search for your city.";
}
