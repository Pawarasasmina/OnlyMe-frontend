export function getUserDisplay(user, status) {
  const name = user?.name || user?.displayName || user?.username || "Max";
  const username = user?.username || String(name).split(" ")[0]?.toLowerCase() || "max";
  const location = user?.city || user?.location || user?.profile?.city || "Dubai";

  return {
    avatar: user?.avatar || user?.profilePhoto || user?.avatarUrl,
    isVerified: Boolean(user?.isVerified || user?.verified),
    location,
    name,
    status: status || user?.status || "🎾 Tennis?",
    username,
  };
}

export function formatSparks(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}
