import FanModal from "../shared/FanModal";
import ProgressBar from "../shared/ProgressBar";
import { atseenCreators } from "../../../data/atseenMockData";

function WorldReaderModal({ active, chapterIndex, onChangeChapter, onClose }) {
  if (!active) {
    return null;
  }

  const creator = atseenCreators[active.creatorId];
  const complete = chapterIndex === active.chapters.length - 1;

  return (
    <FanModal isOpen={Boolean(active)} onClose={onClose} title={`Chapter ${chapterIndex + 1} of ${active.chapters.length}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">
        {active.title} · {creator.name}
      </p>
      <h2 className="mt-1.5 text-xl font-extrabold text-atseen-text">{active.chapters[chapterIndex]}</h2>
      <div className="mt-4 flex gap-1">
        {active.chapters.map((chapter, index) => (
          <ProgressBar className="flex-1" key={chapter} label={`Chapter ${index + 1} progress`} value={index <= chapterIndex ? 100 : 0} />
        ))}
      </div>
      <img alt="" className="mt-5 h-[220px] w-full rounded-[14px] object-cover" src={active.cover} />
      <p className="mt-5 text-[14.5px] leading-8 text-white/90">{active.chapterText[chapterIndex]}</p>
      <div className="mt-6 flex items-center gap-3">
        {chapterIndex > 0 ? (
          <button
            className="rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-sm font-semibold text-atseen-text"
            onClick={() => onChangeChapter(chapterIndex - 1)}
            type="button"
          >
            Previous
          </button>
        ) : null}
        {complete ? (
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xl">✨</p>
            <p className="text-sm font-bold text-atseen-text">You’ve walked the whole world</p>
            <p className="mt-1 text-[11px] text-atseen-muted">Tell {creator.name.split(" ")[0]} what it meant in the app.</p>
          </div>
        ) : (
          <button
            className="min-w-0 flex-1 rounded-[13px] bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-4 py-3 text-sm font-bold text-atseen-bg"
            onClick={() => onChangeChapter(chapterIndex + 1)}
            type="button"
          >
            Next — {active.chapters[chapterIndex + 1]}
          </button>
        )}
      </div>
    </FanModal>
  );
}

export default WorldReaderModal;
