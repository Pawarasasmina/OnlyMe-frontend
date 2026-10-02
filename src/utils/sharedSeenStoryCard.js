import { resolveMediaUrl } from "./media";

function chapterLabel(count = 0) {
  const total = Number(count) || 0;
  return `${total} ${total === 1 ? "chapter" : "chapters"}`;
}

function textFromBlocks(chapters = []) {
  const blocks = chapters.flatMap((chapter) => chapter.blocks || chapter.contentBlocks || []);
  const firstText = blocks.find((block) => block.text || block.body || block.content);
  return String(firstText?.text || firstText?.body || firstText?.content || "").trim();
}

export function sharedSeenCardData(seen = {}, fallback = {}) {
  const id = seen.id || seen._id || fallback.sourceSeenId || "";
  const media = seen.coverMedia || seen.media || {};
  const imageUrl = resolveMediaUrl(media.secureUrl || media.url || fallback.imageUrl || "");
  const chapterCount = seen.chapters?.length ?? seen.chapterCount ?? 0;
  const category = seen.category || seen.topic || "";
  const excerpt = fallback.excerpt || seen.description || seen.summary || textFromBlocks(seen.chapters || []);
  const points = fallback.points || (seen.chapters || [])
    .map((chapter) => chapter.title || chapter.name)
    .filter(Boolean)
    .slice(0, 2);

  return {
    cardBackgroundColor: fallback.cardBackgroundColor || "",
    cardTextColor: fallback.cardTextColor || "",
    destinationRoute: fallback.destinationRoute || (id ? `/seen/${id}` : "/seen"),
    excerpt,
    imageUrl,
    kind: "seen",
    mediaType: String(media.mediaType || media.resourceType || "").toLowerCase().includes("video") ? "video" : "image",
    points,
    subtitle: fallback.subtitle || `${[category, chapterLabel(chapterCount), "tap to open"].filter(Boolean).join(" - ")} >`,
    title: seen.title || fallback.title || "Seen",
    variant: fallback.variant || "compact",
  };
}
