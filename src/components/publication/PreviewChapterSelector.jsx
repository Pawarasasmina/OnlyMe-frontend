const mediaBlocks = (chapter) => (chapter.blocks || []).filter((block) => block.media?.assetId);

function ChapterMediaThumb({ chapter }) {
  const block = mediaBlocks(chapter)[0];
  if (!block) return null;
  if (block.type === "IMAGE" && block.media.secureUrl) return <span className="chapter-list-media"><img alt="" src={block.media.secureUrl} /></span>;
  if (block.type === "VIDEO" && block.media.secureUrl) return <span className="chapter-list-media"><video muted preload="metadata" src={block.media.secureUrl} /><i>▶</i></span>;
  return <span className="chapter-list-media is-audio">♪</span>;
}

export default function PreviewChapterSelector({ chapters, kind, disabled }) {
  return <fieldset className="prototype-journey" disabled={disabled}>
    <legend className="text-lg font-black">The journey</legend>
    <p className="mt-1 text-xs text-atseen-muted">{kind === "WORLD" ? "Every chapter in this free World is open." : "Chapter 1 is free. Chapters 2–5 are Members Only and start residency when unlocked."}</p>
    <div className="chapter-access-list mt-4">
      {chapters.length ? chapters.map((chapter, index) => {
        const isOpen = kind === "WORLD" || index === 0;
        return <div className={isOpen ? "is-preview" : "is-locked"} key={chapter.stableChapterId}>
          <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span><ChapterMediaThumb chapter={chapter} />
          <span className="min-w-0 flex-1 text-left"><strong>{chapter.title || `Chapter ${index + 1}`}</strong><small>{isOpen ? "Open · visible to everyone" : "MEMBERS ONLY · residency required"}{mediaBlocks(chapter).length ? ` · ${mediaBlocks(chapter).length} media` : ""}</small></span>
          <span className="chapter-state">{isOpen ? "Free" : "🔒 Members"}</span>
        </div>;
      }) : <div className="chapter-empty"><span>✦</span><strong>Your story starts with one chapter</strong><small>Add a chapter, then build it with photo, voice, marker, link, and key points.</small></div>}
    </div>
  </fieldset>;
}
