import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
export default function CoinIcon({ size = 10 }) {
  __useUiLanguage();
  return <img alt="" aria-hidden="true" src="/brand/goldcoin.webp" style={{ display: "inline-block", width: size, height: "auto", maxWidth: "none", borderRadius: 0, verticalAlign: -Math.round(size * .16), filter: "drop-shadow(0 1px 3px rgba(0,0,0,.4))" }} />;
}
