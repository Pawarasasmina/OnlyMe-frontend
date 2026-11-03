# Localization implementation and verification

Status: implementation and linguistic review in progress. Full translation-key coverage is not approval of every translation or a completed production release.

## Architecture and storage

The existing `LanguageContext` remains the application-wide source of truth. `src/i18n/runtime.js` provides shared semantic-key translation, ICU MessageFormat, reactive language subscriptions and locale-aware formatting. There is no DOM replacement, runtime machine translation or translation of private user content.

Supported languages are English (`en-US`), Arabic (`ar`, RTL), Russian (`ru-RU`), Ukrainian (`uk-UA`), Spanish (`es-ES`), Portuguese (`pt-PT`), French (`fr-FR`) and German (`de-DE`).

Guest preferences use the existing `atseen_language` key. Explicit choices and per-account synchronization use `atseen_language_choice` and `atseen_account_languages`. Authenticated choices use the existing account-settings API and profile `preferredLanguage` field. The optional `uiLanguageSelectedAt` field distinguishes an explicit selection from a default. Failed saves keep the selected local language and retry after reconnection/sign-in. Writes are serialized and guarded against account-switching and hydration races.

## Files and feature inventory

The available source comparison is in [changed-source-files.json](changed-source-files.json). It compares against partial per-file snapshots from before localization, preserving pre-existing user work. Files without a snapshot are explicitly unclassified; their absence is not evidence that localization created them. The route inventory is [route-matrix.json](route-matrix.json), and the module inventory is [source-inventory.json](source-inventory.json).

Principal additions/changes:

- `src/i18n/`: eight catalogs, runtime, safe backend-error mapping, aliases, fixed option/enum labels, reviewed message resources and regression tests.
- `src/context/LanguageContext.jsx`, `src/hooks/useLanguage.js`: shared state, persistence, account hydration and offline synchronization.
- `src/components/profile/LanguageSetting.jsx`: existing picker integrated with global preferences; the same picker is available on welcome.
- `src/styles/localization.css`, component/layout styles: document direction, logical spacing, mixed-direction isolation and directional icons.
- Feature components and pages: translation keys and reactive static configuration labels; locale formatting and localized system-state rendering.
- `OnlyMe-backend/src/controllers/profileController.js` and FanProfile/CreatorProfile/AdminProfile schemas: explicit preference metadata, with existing API identifiers preserved.
- `scripts/i18n/`, package scripts and Playwright configurations: inventory, coverage, linguistic-review candidates and test fixtures. Offline draft-generation tooling is development-only; model files are excluded from version control.

| Feature group | Source work | Verification scope |
| --- | --- | --- |
| Shared desktop/mobile navigation, layouts, menus | Converted | Route mounting and language switching |
| Authentication and welcome/onboarding | Converted; welcome picker and Arabic navigation updated | Unavailable-state route checks; welcome interaction tests |
| Seen feed, viewers, creation, editing and publishing | Converted | Source/ICU checks; unavailable-state route checks |
| Discover, search, filters and location | Converted | Source/ICU checks; route checks; existing Wall location tests |
| Wall, composer, notes, comments and reactions | Converted | Desktop/mobile creation, recording, search, metadata and interaction regressions |
| Messages, requests, groups, attachments and calls | Converted; call-type labels corrected | Source/ICU checks; unavailable-state route checks |
| Profiles, account categories and editing | Converted | Source/ICU checks; route checks |
| Settings, ownership, deactivation and deletion | Converted; reviewed Settings wording | Ownership desktop/mobile regressions |
| Verification, bank setup and monetization | Converted; missed admin-review/payout copy corrected | Existing verification, manual bank-review and monetization regressions |
| Wallet, gifts, Dreams, earnings and transactions | Converted | Source/ICU checks and unavailable-state route checks; no live financial transactions |
| Worlds, subscriptions and Direct Access | Converted | Source/ICU checks and unavailable-state route checks |
| Activity, notifications, privacy and moderation | Converted; reviewed activity wording and moderation-code labels | Source checks, ownership/privacy regressions and moderation-data preservation checks |
| Stories, sharing, saved content, invitations and AI | Converted | Source/ICU checks and unavailable-state route checks |
| Admin routes and conditional moderation forms | Converted; enum display labels separated from submitted codes | Source/ICU checks; route error states |

“Converted” means source code was migrated; it does not establish that every successful-data state, hidden modal, translation or responsive layout has passed manual review.

## Coverage and wording

See [coverage.json](coverage.json) for exact key/ICU/source results. All eight catalogs currently contain 5,826 keys with no missing keys or invalid ICU argument sets. Explicitly approved brand names, names, technical identifiers and native borrowed terms may remain identical across languages.

The coverage scanner audits 448 source modules and finds 123 route declarations. The route matrix contains 122 entries excluding the wildcard, including 99 non-redirect entries. No raw JSX text or unregistered literal translation keys are reported by that scanner. It does not prove that all dynamically assembled/API-generated text is localized.

An offline model produced draft UI translations. Reviewed prototype copy and implementation-reviewed corrections are applied through `reviewed*.json`; the remaining draft wording is not professionally validated. [linguistic-review.json](linguistic-review.json) records informal-address/regional-vocabulary candidates and possible omissions. Its heuristics can produce false positives and cannot certify unflagged messages. Spanish tú, Portuguese tu, French tu and German du require continued contextual review across the remaining drafts.

## Tests

Latest run results are recorded below when their commands complete. Tests using mocked unavailable APIs do not replace live authenticated, successful-data end-to-end tests.

- `npm run test:i18n`: 7 passed, including ICU/plurals, formatting, name/amount preservation, safe validation handling and source guards against translating controlled inputs/authored moderation feedback.
- `npm run i18n:check`: passed; eight catalogs, no missing/invalid keys or unregistered literal calls detected.
- `npm run build`: passed; existing large-chunk and mixed static/dynamic import warnings remain.
- Settings/feature regression suite excluding two known stale Wall hierarchy expectations: 42 passed. Includes actual reconnect preference synchronization.
- Application browser suite: 14 passed, covering 99 non-redirect route entries in each of English/Russian/Arabic (API-unavailable states), eight-language switching, mobile Arabic, welcome RTL keyboard behavior and authored-feedback preservation. A subsequent targeted run passed all 3 tests, including the added moderation-submission check; translated labels submit original reason codes and preserve typed feedback.
- Full frontend lint: zero errors and 17 warnings, recorded in `tmp/i18n-resume-final-lint.log`.
- Latest full frontend unit run: 28 passed, one stale World-validation expectation failed (`Premium Planet accepts creator presets and only Chapter 1 is free`). The configured Premium World behavior predates localization; it was not changed to satisfy that expectation.
- Earlier scoped backend source tests: 346 passed, one skipped. The broad backend suite is not green: unrelated integration/index-discovery issues remain. No backend changes were added in this continuation.

## Remaining work and limits

- Complete contextual linguistic review of draft catalogs; full key coverage must not be reported as full task completion.
- Exercise successful-data states and remaining nested dialogs with a running authenticated backend, including financial flows and actual admin-approved preferences.
- Complete visual checks of every screen in Arabic RTL and longer desktop/mobile translations. Current route tests verify mounting/direction, not pixel-perfect rendering of every feature.
- Reconcile pre-existing stale tests separately from localization. Two excluded Wall tests expect trailing topic links that had already been removed before localization.
- Catalogs are bundled together; the build warns about a large main chunk. Future catalog splitting can improve initial load but has not been introduced as part of this continuation.

## Manual browser verification

1. Run the backend normally and `npm run dev` in the frontend; sign in.
2. Open Settings → Language. Select each of the eight native language names. Confirm that mounted navigation, headings and controls update immediately.
3. Navigate through feed, Discover, Wall, Messages, profile, Settings, Wallet, World and Direct Access. Open available menus, forms and bottom sheets; verify labels, errors and empty/loading states.
4. Reload and sign out/in. Verify that the explicit choice persists and that another account loads its own preference without overwriting a newer selection.
5. With network requests blocked, choose another language; the UI must switch locally. Restore connectivity and verify synchronization without reverting the choice.
6. Choose Arabic on desktop and mobile. Verify RTL navigation/sheets, readable names, handles, URLs, amounts and authored text. Switch back to English and confirm LTR restoration.
7. Verify that posts, private messages, creator feedback and other authored text remain unchanged. Separate existing “See translation” actions must remain opt-in.
8. Check plural quantities and locale-aware dates/currencies. Compare each screen against the supplied prototype; pricing and payout approval must continue to follow admin configuration, not prototype sample amounts.
