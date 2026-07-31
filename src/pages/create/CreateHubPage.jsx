import { useState } from "react";
import { Link } from "react-router-dom";
import { FiBookOpen, FiEye, FiGrid, FiPlusCircle, FiRadio } from "react-icons/fi";
import FeedPostComposer from "../../components/posts/FeedPostComposer";
import StoryCreator from "../../components/stories/StoryCreator";
import { useAuth } from "../../hooks/useAuth";
import { canCreateStory } from "../../utils/storyPermissions";
import { canCreateFeedPost } from "../../utils/postPermissions";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";

const baseOptions = [
  { title: "Seen", text: "Free, public, 1-3 chapters", to: "/create/seen", icon: FiEye },
  { title: "Home", text: "A longer note, ask, or useful sighting.", icon: FiRadio, opensHomePost: true },
  { title: "World", text: "Coming in next phase", icon: FiGrid },
  { title: "Premium World", text: "Coming in next phase", icon: FiBookOpen },
];

function CreateHubPage() {
  const { user } = useAuth();
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [homePostOpen, setHomePostOpen] = useState(false);
  const canCreate = canCreateStory(user);
  const canPostToHome = canCreateFeedPost(user);
  const display = getUserDisplay(user, "");

  return (
    <div>
      <p className="creator-eyebrow">Create</p>
      <h1 className="creator-page-title">Choose what you want to publish</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {canCreate ? (
          <button
            className="rounded-2xl border border-atseen-blue bg-atseen-blue/10 p-5 text-left transition hover:border-atseen-blue-strong"
            onClick={() => setStoryCreatorOpen(true)}
            type="button"
          >
            <FiPlusCircle className="text-2xl text-atseen-blue" />
            <strong className="mt-4 block">Story</strong>
            <p className="mt-1 text-sm text-atseen-muted">Share a 24-hour photo or video update</p>
          </button>
        ) : null}
        {baseOptions.map(({ icon: Icon, text, title, to }) => (
          to ? (
            <Link className="rounded-2xl border border-atseen-line bg-atseen-surface p-5 transition hover:border-atseen-blue/45" key={title} to={to}>
              <Icon className="text-2xl text-atseen-blue" />
              <strong className="mt-4 block">{title}</strong>
              <p className="mt-1 text-sm text-atseen-muted">{text}</p>
            </Link>
          ) : title === "Home" && canPostToHome ? (
            <button className="rounded-2xl border border-atseen-line bg-atseen-surface p-5 text-left transition hover:border-atseen-blue/45" key={title} onClick={() => setHomePostOpen(true)} type="button">
              <Icon className="text-2xl text-atseen-blue" />
              <strong className="mt-4 block">{title}</strong>
              <p className="mt-1 text-sm text-atseen-muted">{text}</p>
            </button>
          ) : (
            <div className="rounded-2xl border border-atseen-line bg-atseen-surface p-5 opacity-60" key={title}>
              <Icon className="text-2xl text-atseen-muted" />
              <strong className="mt-4 block">{title}</strong>
              <p className="mt-1 text-sm text-atseen-muted">{text}</p>
            </div>
          )
        ))}
      </div>
      <Link className="mt-6 inline-block text-sm font-bold text-atseen-blue underline" to="/creator/content/new">Legacy content</Link>
      <StoryCreator isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
      <FeedPostComposer currentUser={display} isOpen={homePostOpen} onClose={() => setHomePostOpen(false)} />
    </div>
  );
}

export default CreateHubPage;
