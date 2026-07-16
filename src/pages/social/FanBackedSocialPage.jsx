import { useAuth } from "../../hooks/useAuth";
import UnavailableFeaturePage from "./UnavailableFeaturePage";

function FanBackedSocialPage({ children, description, title }) {
  const { user } = useAuth();
  if (user?.role !== "fan") return <UnavailableFeaturePage description={description} title={title} />;
  return children;
}

export default FanBackedSocialPage;
