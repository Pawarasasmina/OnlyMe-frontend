import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiPlusCircle } from "react-icons/fi";
import StoryCreator from "../../components/stories/StoryCreator";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
import { canCreateStory } from "../../utils/storyPermissions";

function CreateHubPage() {
  const { user } = useAuth();
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const canCreate = canCreateStory(user);
  const publicationsQuery = useQuery({
    queryKey: ["creation-capacity"],
    queryFn: () => api.listMyPublications({ kind: "WORLD,PREMIUM_WORLD", limit: 50 })
      .then((response) => response.data.data.items || []),
  });
  const active = (publicationsQuery.data || []).filter((item) =>
    ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED"].includes(item.status));
  const worlds = active.filter((item) => item.kind === "WORLD").length;
  const premium = active.filter((item) => item.kind === "PREMIUM_WORLD").length;
  const cards = [
    { title: "Seen", text: "Free public publication with 1–3 chapters", to: "/create/seen" },
    { title: "World", text: `One-time private experience · one free preview · profile only · ${worlds}/2 used`, to: "/create/world", disabled: worlds >= 2 },
    { title: "Premium World", text: `Monthly private ecosystem · 1–2 previews · profile only · ${premium ? "Already created" : "Available"}`, to: "/create/premium-world", disabled: premium >= 1 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-black">Create</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {canCreate ? (
          <button
            className="rounded-2xl border border-atseen-blue bg-atseen-blue/10 p-5 text-left transition hover:border-atseen-blue-strong"
            onClick={() => setStoryCreatorOpen(true)}
            type="button"
          >
            <FiPlusCircle className="text-2xl text-atseen-blue" />
            <strong className="mt-4 block">Story</strong>
            <p className="mt-2 text-sm text-atseen-muted">Share a 24-hour photo or video update</p>
          </button>
        ) : null}
        {cards.map((card) => card.to && !card.disabled ? (
          <Link className="rounded-2xl border border-atseen-blue p-5" key={card.title} to={card.to}>
            <strong>{card.title}</strong>
            <p className="mt-2 text-sm text-atseen-muted">{card.text}</p>
          </Link>
        ) : (
          <div aria-disabled="true" className="rounded-2xl border border-atseen-line p-5 opacity-60" key={card.title}>
            <strong>{card.title}</strong>
            <p className="mt-2 text-sm text-atseen-muted">{card.text}{card.disabled ? " · Capacity reached" : null}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-atseen-muted">Capacity is loaded from the backend and remains authoritative.</p>
      <Link className="mt-6 inline-block underline" to="/creator/content/new">Legacy content</Link>
      <StoryCreator isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
    </div>
  );
}

export default CreateHubPage;
