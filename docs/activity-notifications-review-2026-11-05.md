# Activity notification review — 5 November 2026

Compared the current frontend and backend with `design/web.html` build v113, the October 17–19 and October 20–26 change documents, and screenshots 3904–3906. Reference documents describe product requirements; prototype demo events and synthetic counts are not production data.

| Notification or behavior | Review result |
| --- | --- |
| Received/Sent tabs and category filters | Already present. Fixed filtering/pagination so older saves are not discarded behind newer events before the Saves filter runs. |
| “I see you” and mutual acknowledgement | Already present; removed decorative emoji from the system line. |
| New followers / Follow back | Already present, using real relationship records and the follow action. |
| Seen and note reactions | Already present, including frontend grouping. Reaction emoji remain content. |
| Photo reactions | Added grouped rows from actual profile-photo reactions, including legacy likes, with a photo-viewer link. |
| Story mentions and reactions | Already present, with story previews and story-viewer destinations. |
| Tagged in a Seen | Added publication notifications for newly tagged people when published, including approval publishing. Repeated publication does not notify unchanged tags again. |
| Saved notes | Fixed anonymous distinct-person counts, bookmark presentation, small note preview, and filtered API visibility. |
| Saved Seens | Already present, including anonymous grouping in the frontend. |
| Saved comments | Added anonymous counts from saved-comment records and links to the original comment. |
| Note comments and support | Already present. |
| Replies to your note comments on another person's post | Added missing threaded reply events and exact comment links. |
| Direct Access requests | Added Answer action for an open, unexpired request, pointing to its exact conversation/window. |
| Direct Access refunds and answers | Added structured destinations; refund notices show returned coins. Duplicate generic “opened” notices are excluded. |
| Booked calls / Direct Access payments | Existing call/window and transaction sources retained. Answer is only enabled for a genuinely open request. |
| Gifts and earnings | Existing gift/ledger sources retained; actual monetary amounts remain server-derived. |
| World membership joins | Existing membership/ledger events retained; publication covers now reach ledger previews. |
| Additional chapters in owned content | Added deduplicated publication notifications for current owners and members. First publication does not count as an added chapter. |
| Reposts | Added real Seen, note, photo and received-comment repost rows. Removing the repost removes its row. Sent comment-repost history is not included in this extension. |
| Three-day renewal reminders | Existing job extended to catch up within the three-day window and process all batches. Per-membership/per-period deduplication retained. |
| Insufficient renewal coins | Added early low-balance warning and failed-renewal notice with a working Top up action. |
| Membership cancellation receipt | Updated subscriber receipt to say access stays open until the actual period-end date. No per-person cancellation notification is sent to the creator. |
| Right-side previews | Compact portrait covers, note mini-cards, photos, and a World fallback. Existing muted looping video behavior retained. |
| Current destinations | Notes open their real posts, Seen links open the current reader, Worlds open the World reader, and DA actions open the exact request. Note and Seen comment links open comments and focus the target. |
| Removed content | Supplementary events resolve current records; deleted notes/photos/reposts are excluded. New tag/chapter notices are suppressed when their publication is unavailable or private to another user. Destination APIs continue enforcing access. |

## Validation

- Backend: 27 tests passed across notification integration, fan Activity helpers, saved-note pagination integration, and premium-membership rules.
- Browser: 6 tests passed, covering saved notes at desktop/mobile widths, anonymous grouping, saved comments, Answer navigation, and Top up navigation.
- Targeted frontend/backend lint passed. Frontend production build passed (existing bundle-size warnings remain).
- Integration fixtures use an isolated in-memory database and disable external email delivery.

## Limits and deployment

The screenshot's names, counts, gift values and times are examples. Rows appear only when corresponding real events exist. This does not manufacture historical tag/chapter notices for publications already published before this change.

In-app notices and the existing renewal/cancellation email path are implemented. Device/browser push delivery mentioned in the launch checklist is not available: this repository has no push subscription/provider service. That requires a separate delivery integration and configuration. Email delivery and scheduled renewals require the existing backend worker and email configuration in the deployed environment.

These changes have not been committed, pushed, or deployed in this task.
