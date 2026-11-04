/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
const mediaBlocks = (chapter) => (chapter.blocks || []).filter((block) => block.media?.assetId);

function ChapterMediaThumb({ chapter }) {
  __useUiLanguage();
  const block = mediaBlocks(chapter)[0];
  if (!block) return null;
  if (block.type === "IMAGE" && block.media.secureUrl) return <span className="chapter-list-media"><img alt="" src={block.media.secureUrl} /></span>;
  if (block.type === "VIDEO" && block.media.secureUrl) return <span className="chapter-list-media"><video muted preload="metadata" src={block.media.secureUrl} /><i>▶</i></span>;
  return <span className="chapter-list-media is-audio">♪</span>;
}

export default function PreviewChapterSelector({ chapters, kind, disabled }) {
  __useUiLanguage();
  return <fieldset className="prototype-journey" disabled={disabled}>
    <legend className="text-lg font-black">{__msg("publication.theJourney")}</legend>
    <p className="mt-1 text-xs text-atseen-muted">{kind === "WORLD" ? __msg("publication.everyChapterInThisFreeWorldIsOpen") : __msg("publication.chapter1IsFreeChapters25AreMembers")}</p>
    <div className="chapter-access-list mt-4">
      {chapters.length ? chapters.map((chapter, index) => {
        const isOpen = kind === "WORLD" || index === 0;
        return <div className={isOpen ? "is-preview" : "is-locked"} key={chapter.stableChapterId}>
          <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span><ChapterMediaThumb chapter={chapter} />
          <span className="min-w-0 flex-1 text-start"><strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong><small>{isOpen ? __msg("publication.openVisibleToEveryone") : __msg("publication.membersOnlyResidencyRequired")}{mediaBlocks(chapter).length ? __msg("publication.media", { value0: mediaBlocks(chapter).length }) : ""}</small></span>
          <span className="chapter-state">{isOpen ? __msg("profile.free") : __msg("publication.members")}</span>
        </div>;
      }) : <div className="chapter-empty"><span>✦</span><strong>{__msg("publication.yourStoryStartsWithOneChapter")}</strong><small>{__msg("publication.addAChapterThenBuildItWithPhotoVoice")}</small></div>}
    </div>
  </fieldset>;
}
