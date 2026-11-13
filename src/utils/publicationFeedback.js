export function publicationFeedback(before, payload) {
  const publication = payload?.publication;
  if (publication?.status !== "PUBLISHED") return null;
  return {
    id: publication.id || publication._id || before.id,
    title: publication.title || before.title,
    coverMedia: publication.coverMedia || before.coverMedia,
    updated: Boolean(before.publishedAt || before.publishedVersion),
    aiBonusGranted: payload.aiBonusGranted === true,
  };
}
