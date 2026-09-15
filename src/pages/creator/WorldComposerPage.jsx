import ComingSoonOverlay from "../../components/common/ComingSoonOverlay";

export default function WorldComposerPage({ experience = false }) {
  return <ComingSoonOverlay
    description={experience
      ? "Create guided, chapter-based journeys that can be free for everyone or unlocked with one permanent payment."
      : "Create your own subscriber World—a closer space for premium chapters, stories, and community access."}
    highlights={experience
      ? ["Structured chapters", "Free or one-time unlock", "Creator-led journeys"]
      : ["Monthly membership", "Private chapters and stories", "A home for your closest audience"]}
    icon={experience ? "✦" : "🪐"}
    title={experience ? "Experience creation" : "World creation"}
  />;
}
