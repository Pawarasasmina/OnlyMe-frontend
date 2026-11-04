import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useAuth } from "../../hooks/useAuth";
import UnavailableFeaturePage from "./UnavailableFeaturePage";

function FanBackedSocialPage({ children, description, title }) {
  __useUiLanguage();
  const { user } = useAuth();
  if (user?.role !== "fan") return <UnavailableFeaturePage description={description} title={title} />;
  return children;
}

export default FanBackedSocialPage;
