import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiCheckCircle, FiEdit3, FiGrid, FiLock, FiMessageCircle, FiSettings } from "react-icons/fi";
import { profileOwnerActionKeys } from "../../utils/profileCapabilities";
import { messageService } from "../../services/messageService";

const definitions = {
  edit: ["Edit profile", "/settings", FiEdit3],
  create: ["Create content", "/creator/content/new", FiEdit3],
  studio: ["Creator Studio", "/studio", FiGrid],
  content: ["Content manager", "/creator/content", FiGrid],
  verification: ["Verification", "/creator/verification", FiCheckCircle],
  settings: ["Settings", "/settings", FiSettings],
  security: ["Password & security", "/settings/security", FiLock],
  direct: ["Direct Access", "/messages?tab=direct", FiMessageCircle],
  public: ["View public profile", null, FiCheckCircle],
};

function ProfileOwnerActions({ capabilities, role, username }) {
  const directWindows = useQuery({
    queryKey: ["messages", "direct-access"],
    queryFn: () => messageService.getDirectAccessWindows().then((response) => response.data.data.windows),
    enabled: role === "creator" && capabilities.isOwner,
    staleTime: 30000,
  });
  const waiting = (directWindows.data || []).filter((item) => item.settlementStatus === "HELD").length;
  const keys = profileOwnerActionKeys(capabilities, role);
  if (!keys.length) return null;
  if (role === "creator" && username) keys.push("public");
  return <section className="mt-4 grid gap-2 sm:grid-cols-2">{keys.map((key) => { const [label, configuredTo, Icon] = definitions[key]; const to = key === "public" ? `/profile/${username}` : configuredTo; return <Link className={`flex items-center gap-3 rounded-2xl border bg-atseen-surface px-4 py-3 text-sm font-semibold transition hover:border-atseen-blue/45 ${key === "direct" ? "border-atseen-blue/30" : "border-atseen-line"}`} key={key} to={to}><Icon className="text-atseen-blue" />{key === "direct" ? <span className="flex flex-1 items-center justify-between"><span>{label}</span>{waiting ? <span className="rounded-full bg-atseen-warning/15 px-2 py-1 text-[10px] font-black text-atseen-warning">● {waiting} waiting</span> : null}</span> : label}</Link>; })}</section>;
}

export default ProfileOwnerActions;
