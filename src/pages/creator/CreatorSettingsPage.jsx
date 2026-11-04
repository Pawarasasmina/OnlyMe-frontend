/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { FiAward, FiChevronRight, FiLock, FiUser } from "react-icons/fi";

export default function CreatorSettingsPage() {
  __useUiLanguage();
  const rows = [
    { to: "/creator/profile", icon: FiUser, title: __msg("layouts.profileSettings"), text: __msg("creator.publicIdentityImagesPricingPrivacyAndCreatorPreferences") },
    { to: "/creator/verified", icon: FiAward, title: __msg("creator.verifiedCreator"), text: __msg("creator.applyForOrManageYourMonthlyBlueTick") },
    { to: "/creator/settings/security", icon: FiLock, title: __msg("creator.security"), text: __msg("creator.changeYourAccountPasswordUsingYourCurrentPassword") },
  ];
  return <div className="mx-auto max-w-4xl"><p className="creator-eyebrow">{__msg("layouts.account")}</p><h1 className="creator-page-title">{__msg("profile.settings")}</h1><p className="creator-muted mt-2">{__msg("creator.manageThePartsOfYourCreatorAccountThatAre")}</p><div className="mt-7 grid gap-3">{rows.map(({ to, icon: Icon, title, text }) => <Link className="creator-card flex items-center gap-4 p-5 transition hover:border-sky-300/20 hover:bg-sky-300/[0.04]" key={to} to={to}><span className="rounded-xl bg-sky-300/10 p-3 text-xl text-sky-300"><Icon /></span><span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="mt-1 block text-sm text-slate-400">{text}</span></span><FiChevronRight data-ui-directional="true" className="text-slate-500" /></Link>)}</div></div>;
}
