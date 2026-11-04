/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import WorldCard from "../../components/fanWeb/worlds/WorldCard";
import WorldReaderModal from "../../components/fanWeb/worlds/WorldReaderModal";
import { atseenWorlds } from "../../data/atseenMockData";

function WorldsPage() {
  __useUiLanguage();
  const [activeWorld, setActiveWorld] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(0);

  const openChapter = (world, index) => {
    setActiveWorld(world);
    setChapterIndex(index);
  };

  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">{__msg("orbit.worlds")}</h1>
      <p className="mt-1.5 text-sm leading-6 text-atseen-muted">{__msg("fan.aNewFormatNotPicturesNotVideosRealExperiences")}</p>
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
