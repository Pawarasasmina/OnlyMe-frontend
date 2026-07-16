import { Link } from "react-router-dom";
import { FiCheckCircle, FiEdit3, FiGrid, FiLock, FiSettings } from "react-icons/fi";
import { profileOwnerActionKeys } from "../../utils/profileCapabilities";

const definitions = {
  edit: ["Edit profile", "/settings", FiEdit3],
  create: ["Create content", "/creator/content/new", FiEdit3],
  studio: ["Creator Studio", "/studio", FiGrid],
  content: ["Content manager", "/creator/content", FiGrid],
  verification: ["Verification", "/creator/verification", FiCheckCircle],
  settings: ["Settings", "/settings", FiSettings],
  security: ["Password & security", "/settings/security", FiLock],
  public: ["View public profile", null, FiCheckCircle],
};

function ProfileOwnerActions({ capabilities, role, username }) {
  const keys = profileOwnerActionKeys(capabilities, role);
  if (!keys.length) return null;
  if (role === "creator" && username) keys.push("public");
  return <section className="mt-4 grid gap-2 sm:grid-cols-2">{keys.map((key) => { const [label, configuredTo, Icon] = definitions[key]; const to = key === "public" ? `/profile/${username}` : configuredTo; return <Link className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface px-4 py-3 text-sm font-semibold transition hover:border-atseen-blue/45" key={key} to={to}><Icon className="text-atseen-blue" />{label}</Link>; })}</section>;
}

export default ProfileOwnerActions;
