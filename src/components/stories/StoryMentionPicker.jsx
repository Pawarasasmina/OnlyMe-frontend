import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { storyService } from "../../services/storyService";

export default function StoryMentionPicker({ onClose, onSelect, selectedIds }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const people = useQuery({ queryKey: ["story-mention-people", query], queryFn: ({ signal }) => storyService.searchPeople(query, signal), retry: false });
  return <div className="story-mention-backdrop" onClick={(event) => { if (event.target === event.currentTarget) { event.stopPropagation(); onClose(); } }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <section aria-label="Mention" aria-modal="true" className="story-mention-sheet" role="dialog">
      <h2 className="story-mention-title">Mention</h2>
      <button aria-label="Close mentions" className="story-mention-close" onClick={onClose} type="button">Close</button>
      <input aria-label="Search people to mention" autoFocus className="story-mention-search" onChange={(event) => setSearch(event.target.value)} placeholder="Search people" value={search} />
      <div className="story-mention-results">
        {people.isPending || search !== query ? <p role="status">Finding people…</p> : null}
        {people.isError ? <div role="alert"><p>Could not load people.</p><button onClick={() => people.refetch()} type="button">Retry</button></div> : null}
        {!people.isPending && !people.isError && !people.data?.length ? <p>No people found.</p> : null}
        {search === query ? people.data?.map((person) => <button className="story-mention-person" disabled={selectedIds.includes(person.id)} key={person.id} onClick={() => onSelect(person)} type="button">
          <FanAvatar className="story-mention-avatar" name={person.name} size="h-10 w-10" src={person.avatarUrl || person.avatar} />
          <span className="story-mention-identity"><b>{person.name}</b><small>@{person.username}</small></span>{selectedIds.includes(person.id) ? <small className="story-mention-added">Added</small> : null}
        </button>) : null}
      </div>
    </section>
  </div>;
}
