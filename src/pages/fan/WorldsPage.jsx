import { useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import WorldCard from "../../components/fanWeb/worlds/WorldCard";
import WorldReaderModal from "../../components/fanWeb/worlds/WorldReaderModal";
import { atseenWorlds } from "../../data/atseenMockData";

function WorldsPage() {
  const [activeWorld, setActiveWorld] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(0);

  const openChapter = (world, index) => {
    setActiveWorld(world);
    setChapterIndex(index);
  };

  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">Worlds</h1>
      <p className="mt-1.5 text-sm leading-6 text-atseen-muted">
        A new format. Not pictures, not videos — real experiences you can step into.
      </p>
      <Link className="mt-5 flex min-h-12 items-center gap-3 rounded-[14px] border border-atseen-line bg-atseen-surface-2 px-4 text-sm font-semibold text-atseen-dim transition hover:border-atseen-blue/50 hover:text-white" to="/search?type=worlds">
        <FiSearch aria-hidden="true" />
        <span>Search people, Worlds, Seens, posts or places</span>
      </Link>
      <div className="mt-[22px]">
        {atseenWorlds.map((world) => (
          <WorldCard key={world.id} onOpenChapter={openChapter} world={world} />
        ))}
      </div>
      <WorldReaderModal
        active={activeWorld}
        chapterIndex={chapterIndex}
        onChangeChapter={setChapterIndex}
        onClose={() => setActiveWorld(null)}
      />
    </div>
  );
}

export default WorldsPage;
