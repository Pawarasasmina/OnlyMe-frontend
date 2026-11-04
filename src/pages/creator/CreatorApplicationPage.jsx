import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Navigate } from "react-router-dom";

function CreatorApplicationPage() {
  __useUiLanguage();
  return <Navigate replace to="/creator/verification" />;
}

export default CreatorApplicationPage;
