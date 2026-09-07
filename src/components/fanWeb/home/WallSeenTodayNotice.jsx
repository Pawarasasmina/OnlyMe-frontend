import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wallService } from "../../../services/wallService";
import SeenTodaySheet from "./SeenTodaySheet";

const emptySeenToday = { count: 0, hasUnseen: false, people: [], unseenCount: 0 };
const queryKey = ["wall", "saw-you-today"];

function WallSeenTodayNotice() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState(emptySeenToday);

  const sawYouQuery = useQuery({
    queryKey,
    queryFn: () => wallService.getSawYouToday().then((res) => res.data?.data || emptySeenToday),
    retry: 1,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (eventIds) => wallService.acknowledgeSawYouToday(eventIds),
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
    },
  });

  const seenToday = sawYouQuery.data || emptySeenToday;
  const people = useMemo(() => seenToday.people || [], [seenToday.people]);
  const count = Number(seenToday.count || people.length || 0);
  const showNotice = count > 0 && Boolean(seenToday.hasUnseen);

  const handleOpen = useCallback(() => {
    if (count <= 0) return;
    const openedBatch = { count, hasUnseen: Boolean(seenToday.hasUnseen), people };
    const events = people
      .map((person) => ({ eventId: person.eventId, occurredAt: person.occurredAt }))
      .filter((event) => event.eventId && event.occurredAt);

    setActiveBatch(openedBatch);
    setSheetOpen(true);
    queryClient.setQueryData(queryKey, (current = emptySeenToday) => ({
      ...current,
      hasUnseen: false,
      unseenCount: 0,
    }));
    acknowledgeMutation.mutate(events);
  }, [acknowledgeMutation, count, people, queryClient, seenToday.hasUnseen]);

  const handleClose = useCallback(() => {
    setSheetOpen(false);
  }, []);

  if (!sheetOpen && (sawYouQuery.isLoading || sawYouQuery.isError || !showNotice)) {
    return null;
  }

  return (
    <>
      {showNotice ? (
        <button
          aria-label={`${count} ${count === 1 ? "person" : "people"} saw you today. View people.`}
          className="home-seen-today"
          onClick={handleOpen}
          type="button"
        >
          <strong>{count}</strong>
          <span>saw you today</span>
          <span aria-hidden="true">&rsaquo;</span>
        </button>
      ) : null}

      <SeenTodaySheet
        count={activeBatch.count}
        isOpen={sheetOpen}
        onClose={handleClose}
        people={activeBatch.people}
      />
    </>
  );
}

export default WallSeenTodayNotice;
