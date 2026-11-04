import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiCheckCircle, FiEdit3, FiGrid, FiLock, FiMessageCircle, FiSettings } from "react-icons/fi";
import { profileOwnerActionKeys } from "../../utils/profileCapabilities";
import { messageService } from "../../services/messageService";

const definitions = {
  edit: __uiTuple([{ __uiMessage: "fan.editProfile_15141e" }, "/settings", FiEdit3]),
  create: __uiTuple([{ __uiMessage: "creator.createContent" }, "/creator/content/new", FiEdit3]),
  studio: __uiTuple([{ __uiMessage: "creator.creatorStudio" }, "/studio", FiGrid]),
  content: __uiTuple([{ __uiMessage: "creator.contentManager" }, "/creator/content", FiGrid]),
  verification: __uiTuple([{ __uiMessage: "social.verification" }, "/creator/verification", FiCheckCircle]),
  settings: __uiTuple([{ __uiMessage: "profile.settings" }, "/settings", FiSettings]),
  security: __uiTuple([{ __uiMessage: "profile.passwordSecurity" }, "/settings/security", FiLock]),
  direct: ["Direct Access", "/settings/direct-access", FiMessageCircle],
  public: __uiTuple([{ __uiMessage: "profile.viewPublicProfile" }, null, FiCheckCircle]),
};

function ProfileOwnerActions({ capabilities, role, username }) {
  __useUiLanguage();
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
  return <section className="mt-4 grid gap-2 sm:grid-cols-2">{keys.map((key) => { const [label, configuredTo, Icon] = definitions[key]; const to = key === "public" ? `/profile/${username}` : configuredTo; return <Link className={`flex items-center gap-3 rounded-2xl border bg-atseen-surface px-4 py-3 text-sm font-semibold transition hover:border-atseen-blue/45 ${key === "direct" ? "border-atseen-blue/30" : "border-atseen-line"}`} key={key} to={to}><Icon className="text-atseen-blue" />{key === "direct" ? <span className="flex flex-1 items-center justify-between"><span>{label}</span>{waiting ? <span className="rounded-full bg-atseen-warning/15 px-2 py-1 text-[10px] font-black text-atseen-warning">● {waiting} {__msg("profile.waiting")}</span> : null}</span> : label}</Link>; })}</section>;
}

export default ProfileOwnerActions;
