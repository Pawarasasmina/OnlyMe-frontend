import { useParams } from "react-router-dom";
import WorldPublishingPage from "./WorldPublishingPage";

export default function WorldComposerPage() {
  const { id } = useParams();
  return <WorldPublishingPage publicationId={id} />;
}
