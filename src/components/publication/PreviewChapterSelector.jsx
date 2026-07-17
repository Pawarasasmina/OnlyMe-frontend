const mediaBlocks = (chapter) => (chapter.blocks || []).filter((block) => block.media?.assetId);

function ChapterMediaThumb({ chapter }) {
  const block = mediaBlocks(chapter)[0];
  if (!block) return null;
  if (block.type === "IMAGE" && block.media.secureUrl) return <span className="chapter-list-media"><img alt="" src={block.media.secureUrl} /></span>;
  if (block.type === "VIDEO" && block.media.secureUrl) return <span className="chapter-list-media"><video muted preload="metadata" src={block.media.secureUrl} /><i>▶</i></span>;
  return <span className="chapter-list-media is-audio">♪</span>;
}

export default function PreviewChapterSelector({ chapters, kind, onChange, disabled }) {
  const count = chapters.filter((chapter) => chapter.isPreview).length;
  const toggle = (chapter) => { if (kind === "WORLD") return onChange(chapters.map((item) => ({ ...item, isPreview: item.stableChapterId === chapter.stableChapterId }))); if (chapter.isPreview && count === 1) return; if (!chapter.isPreview && (count >= 2 || count === chapters.length - 1)) return; onChange(chapters.map((item) => item.stableChapterId === chapter.stableChapterId ? { ...item, isPreview: !item.isPreview } : item)); };
  return <fieldset className="prototype-journey" disabled={disabled}><legend className="text-lg font-black">The journey</legend><p className="mt-1 text-xs text-atseen-muted">{kind === "WORLD" ? "Choose one chapter people can step into for free." : "Choose one or two free chapters. Keep at least one chapter private."}</p><div className="chapter-access-list mt-4">{chapters.length ? chapters.map((chapter, index) => <button className={chapter.isPreview ? "is-preview" : "is-locked"} key={chapter.stableChapterId} onClick={() => toggle(chapter)} type="button"><span className="chapter-number">{String(index + 1).padStart(2, "0")}</span><ChapterMediaThumb chapter={chapter} /><span className="min-w-0 flex-1 text-left"><strong>{chapter.title || `Chapter ${index + 1}`}</strong><small>{chapter.isPreview ? "Free preview · visible to everyone" : "Private chapter · unlock required"}{mediaBlocks(chapter).length ? ` · ${mediaBlocks(chapter).length} media` : ""}</small></span><span className="chapter-state">{chapter.isPreview ? "Preview" : "🔒 Locked"}</span></button>) : <div className="chapter-empty"><span>✦</span><strong>Your story starts with one chapter</strong><small>Add a chapter below, then build it with text, media, voice, links, and key points.</small></div>}</div></fieldset>;
}
