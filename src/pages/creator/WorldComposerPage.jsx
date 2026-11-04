import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Navigate, useParams } from "react-router-dom";
import WorldPublishingPage from "./WorldPublishingPage";

export default function WorldComposerPage({ experience = false }) {
  __useUiLanguage();
  const { id = "" } = useParams();
  if (id && !experience) return <Navigate replace to={`/world/${id}?edit=1`} />;
  return <WorldPublishingPage experience={experience} publicationId={id} />;
}
