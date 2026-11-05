export const SESSION_RETURN_TO_KEY = "onlyme_session_return_to";

export function safeSessionReturnTo(value) {
  const path = String(value || "");
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login") ? path : "";
}

export function rememberSessionReturnTo(location = window.location) {
  const returnTo = safeSessionReturnTo(`${location.pathname || ""}${location.search || ""}${location.hash || ""}`);
  if (returnTo) sessionStorage.setItem(SESSION_RETURN_TO_KEY, returnTo);
  return returnTo;
}

export function consumeSessionReturnTo() {
  const value = safeSessionReturnTo(sessionStorage.getItem(SESSION_RETURN_TO_KEY));
  sessionStorage.removeItem(SESSION_RETURN_TO_KEY);
  return value;
}
