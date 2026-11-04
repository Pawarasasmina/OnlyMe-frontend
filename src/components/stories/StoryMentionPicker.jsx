/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { storyService } from "../../services/storyService";

export default function StoryMentionPicker({ onClose, onSelect, selectedIds }) {
  __useUiLanguage();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const people = useQuery({ queryKey: ["story-mention-people", query], queryFn: ({ signal }) => storyService.searchPeople(query, signal), retry: false });
  return <div className="story-mention-backdrop" onClick={(event) => { if (event.target === event.currentTarget) { event.stopPropagation(); onClose(); } }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <section aria-label={__msg("stories.mention")} aria-modal="true" className="story-mention-sheet" role="dialog">
      <h2 className="story-mention-title">{__msg("stories.mention")}</h2>
      <button aria-label={__msg("stories.closeMentions")} className="story-mention-close" onClick={onClose} type="button">{__msg("activity.close")}</button>
      <input aria-label={__msg("stories.searchPeopleToMention")} autoFocus className="story-mention-search" onChange={(event) => setSearch(event.target.value)} placeholder={__msg("stories.searchPeople")} value={search} />
      <div className="story-mention-results">
        {people.isPending || search !== query ? <p role="status">{__msg("stories.findingPeople")}</p> : null}
        {people.isError ? <div role="alert"><p>{__msg("stories.couldNotLoadPeople")}</p><button onClick={() => people.refetch()} type="button">{__msg("activity.retry")}</button></div> : null}
        {!people.isPending && !people.isError && !people.data?.length ? <p>{__msg("stories.noPeopleFound")}</p> : null}
        {search === query ? people.data?.map((person) => <button className="story-mention-person" disabled={selectedIds.includes(person.id)} key={person.id} onClick={() => onSelect(person)} type="button">
          <FanAvatar className="story-mention-avatar" name={person.name} size="h-10 w-10" src={person.avatarUrl || person.avatar} />
          <span className="story-mention-identity"><b dir="auto">{person.name}</b><small dir="auto">@{person.username}</small></span>{selectedIds.includes(person.id) ? <small className="story-mention-added">{__msg("stories.added")}</small> : null}
        </button>) : null}
      </div>
    </section>
  </div>;
}
