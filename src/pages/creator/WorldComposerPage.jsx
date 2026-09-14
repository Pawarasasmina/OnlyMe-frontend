import { useParams } from "react-router-dom";
import WorldPublishingPage from "./WorldPublishingPage";

export default function WorldComposerPage({ experience = false }) {
  const { id } = useParams();
  return <WorldPublishingPage experience={experience} publicationId={id} />;
}
