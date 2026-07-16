export function getUserDisplay(user, status) {
  const name = user?.name || user?.displayName || user?.username || "Account";
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
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}
