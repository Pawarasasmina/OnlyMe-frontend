import { useState } from "react";
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
