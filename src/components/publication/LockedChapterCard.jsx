/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
export default function LockedChapterCard({chapter,index}){
  __useUiLanguage();return <div aria-label={__msg("publication.chapterLocked", { value0: index+1 })} className="rounded-xl border border-atseen-line bg-black/20 p-4"><strong dir="auto">🔒 {index+1}. {chapter.title}</strong><p className="mt-1 text-xs text-atseen-muted">{__msg("publication.lockedChapterContentUnavailable")}</p></div>}
