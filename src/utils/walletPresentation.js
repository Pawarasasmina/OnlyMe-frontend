export function walletRate(wallet) {
  const rate = Number(wallet?.starsPerUsd);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function walletPacks(wallet) {
  // Prices, coin credits and bonuses come from the server's configured catalogue.
  const packs = wallet?.topUpPacks;
  if (!Array.isArray(packs)) return [];
  return packs.filter(pack => Number.isFinite(Number(pack.usd)) && Number(pack.usd) > 0
    && Number.isSafeInteger(Number(pack.stars)) && Number(pack.stars) > 0
    && Number.isSafeInteger(Number(pack.bonusStars ?? 0)) && Number(pack.bonusStars ?? 0) >= 0)
    .map(pack => ({ ...pack, usd: Number(pack.usd), chargeUsd: Number(pack.totalUsd ?? pack.usd), taxUsd: Number(pack.taxUsd ?? 0), bonus: Number(pack.bonusStars ?? 0),
      total: Number(pack.stars) + Number(pack.bonusStars ?? 0) }));
}

export function ledgerUsd(item, rate) {
  const stored = item.usdAmount ?? item.metadata?.usdAmount;
  if (stored != null && Number.isFinite(Number(stored))) return Math.abs(Number(stored));
  return rate ? Math.abs(Number(item.starsChange)) / rate : null;
}
