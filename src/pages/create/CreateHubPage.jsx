/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPlusCircle } from "react-icons/fi";
import StoryCreator from "../../components/stories/StoryCreator";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
import { canCreateStory } from "../../utils/storyPermissions";
import { socialCapabilitiesFor } from "../../utils/socialAccess";
import { useLanguage } from "../../hooks/useLanguage";

function CreateHubPage() {
  __useUiLanguage();
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialStoryDraft = location.state?.storyDraft || null;
  const returnTo = location.state?.returnTo || "";
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(Boolean(location.state?.openStoryComposer || searchParams.get("story") === "1"));
  const canCreate = canCreateStory(user);
  const capabilities = socialCapabilitiesFor(user);
  const publicationsQuery = useQuery({
    queryKey: ["creation-capacity"],
    queryFn: () => api.listMyPublications({ kind: "PREMIUM_WORLD", limit: 50 })
      .then((response) => response.data.data.items || []),
    enabled: capabilities.isApprovedCreator,
  });
  const active = (publicationsQuery.data || []).filter((item) =>
    ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED"].includes(item.status));
  const premium = active.filter((item) => item.kind === "PREMIUM_WORLD").length;
  const cards = [
    { title: t("Free Seen"), text: "Up to 5 chapters · every chapter is open to everyone", to: "/create/seen?type=free" },
    { title: t("Paid Seen"), text: "Up to 5 chapters · chapter 1 is free and the rest unlock once", to: "/create/seen?type=paid" },
    ...(capabilities.isApprovedCreator ? [{ title: __msg("create.premiumExperience"), text: __msg("create.multiChapterJourneyFirstChapterFreeOneTime"), to: "/create/experience" }] : []),
    ...(capabilities.isApprovedCreator ? [{ title: __msg("admin.world"), text: __msg("create.monthlySubscriptionPrivateEcosystemProfileOnlyValue0", { value0: premium ? __msg("create.alreadyCreated") : __msg("social.available") }), to: "/create/premium-world", disabled: premium >= 1 }] : []),
  ];

  return (
    <div>
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/profile"><FiArrowLeft data-ui-directional="true" /> {__msg("create.backToProfile")}</Link>
      <h1 className="text-3xl font-black">{__msg("fanWeb.create")}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {canCreate ? (
          <button
            className="rounded-2xl border border-atseen-blue bg-atseen-blue/10 p-5 text-start transition hover:border-atseen-blue-strong"
            onClick={() => setStoryCreatorOpen(true)}
            type="button"
          >
            <FiPlusCircle className="text-2xl text-atseen-blue" />
            <strong className="mt-4 block">{__msg("activity.story")}</strong>
            <p className="mt-2 text-sm text-atseen-muted">{__msg("create.shareA24HourPhotoOrVideoUpdate")}</p>
          </button>
        ) : null}
        {cards.map((card) => card.to && !card.disabled ? (
          <Link className="rounded-2xl border border-atseen-blue p-5" key={card.title} to={card.to}>
            <strong dir="auto">{card.title}</strong>
            <p dir="auto" className="mt-2 text-sm text-atseen-muted">{card.text}</p>
          </Link>
        ) : (
          <div aria-disabled="true" className="rounded-2xl border border-atseen-line p-5 opacity-60" key={card.title}>
            <strong dir="auto">{card.title}</strong>
            <p dir="auto" className="mt-2 text-sm text-atseen-muted">{card.text}{card.disabled ? __msg("create.capacityReached") : null}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-atseen-muted">{__msg("create.capacityIsLoadedFromTheBackendAndRemainsAuthoritative")}</p>
      <Link className="mt-6 inline-block underline" to="/creator/content/new">{__msg("create.legacyContent")}</Link>
      <StoryCreator
        initialContent={initialStoryDraft}
        isOpen={storyCreatorOpen}
        onClose={() => {
          setStoryCreatorOpen(false);
          if (location.state?.openStoryComposer) navigate(returnTo || "/discover", { replace: true });
        }}
      />
    </div>
  );
}

export default CreateHubPage;
