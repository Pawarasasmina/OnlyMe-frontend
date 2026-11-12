export default function CoinAmount({ value, className = "", iconClassName = "h-[1em] w-[1em]" }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`.trim()}>
      <img alt="coins" className={`shrink-0 object-contain ${iconClassName}`.trim()} src="/brand/goldcoin.png" />
      <span>{value}</span>
    </span>
  );
}
