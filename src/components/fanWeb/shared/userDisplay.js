import { getLocale as __uiLocale } from "../../../i18n/runtime.js";
import { msg as __msg } from "../../../i18n/runtime.js";
export function getUserDisplay(user, status) {
  const name = user?.name || user?.displayName || user?.username || __msg("layouts.account");
  const username = user?.username || String(name).split(" ")[0]?.toLowerCase() || "account";

  return {
    avatar: user?.avatar || user?.profilePhoto || user?.avatarUrl,
    isVerified: Boolean(user?.isVerified || user?.verified),
    location: user?.city || user?.location || user?.profile?.city || "",
    name,
    status: status || "",
    username,
  };
}

export function formatSparks(value) {
  return new Intl.NumberFormat(__uiLocale()).format(Number(value) || 0);
}
