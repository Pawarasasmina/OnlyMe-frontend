const normalize = (value) => String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();

export function transcriptAlreadyShown(postText, transcript) {
  const voice = normalize(transcript);
  if (!voice) return false;
  if (normalize(postText) === voice) return true;
  // The existing composer appends converted speech as its own paragraph.
  return String(postText || "").split(/\n\s*\n/).some((paragraph) => normalize(paragraph) === voice);
}


export function wallPostCaption(text, media = []) {
  const transcripts = new Set(media.filter((item) => item.type === "audio" && item.transcript?.trim()).map((item) => normalize(item.transcript)));
  if (transcripts.has(normalize(text))) return "";
  return String(text || "").split(/\n\s*\n/).filter((paragraph) => !transcripts.has(normalize(paragraph))).join("\n\n").trim();
}
