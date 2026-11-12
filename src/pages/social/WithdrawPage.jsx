import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Navigate } from "react-router-dom";

export default function WithdrawPage() {
  __useUiLanguage();
  return <Navigate replace to="/wallet?tab=income&withdraw=1" />;
}
