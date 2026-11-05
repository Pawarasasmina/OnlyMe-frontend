# Money, coins, prices and payouts — implementation gap review

Reviewed 5 November 2026. This is a source-code review, not a production payment or database audit. No application behavior was changed.

## Sources and interpretation

- All six pages of `D:/Downloads/atseen-dev-changes-oct20-26.pdf`, especially money rules on pp. 1–2, World/subscription rules on pp. 4–5 and launch requirements on p. 6.
- `D:/Downloads/-seen-copy-main (15)/-seen-copy-main/design/web.html`, including the final pricing overrides around lines 18520–18524 and payout overrides around 18317–18345. The supplied screenshot repeats PDF page 1.
- Current local frontend, `OnlyMe-backend`, and `atseen-mobile` source. Existing unrelated workspace changes were left alone.

The attachments are requirements/reference material, not authorization to implement changes. The PDF explicitly describes final decisions. Older prototype definitions must not override later definitions or those decisions. Provider availability, tax treatment, store policies and legal claims in the attachments have not been independently validated here.

## Conclusion

Substantial implementation work remains. The existing ledger, wallet screens, source-balance buckets, spending limits and membership lifecycle provide a useful base. The current system does not yet implement the final purchase economics or payout processing. Several older rules directly contradict the update.

## 1. Creator earnings: critical

**Requirement:** Every 10 coins spent on a creator earns $1, across channels and including bonus-funded spending. No creator commission or temporary rate. The separately specified instant payout fee is an exception for that payout method.

**Current evidence:**

- `OnlyMe-backend/src/services/starExchangeService.js`: default 10 coins/USD, but the rate is admin-editable and read dynamically.
- `OnlyMe-backend/src/services/walletLedgerService.js`: ordinary transfers credit the full coin amount to the creator, including spending allocated from a fan's bonus bucket.
- `OnlyMe-backend/src/services/directAccessService.js`: 10% platform deduction, rising to 20% for creator reopens/fan follow-ups; both settlement and serialized earnings reflect this.
- `OnlyMe-backend/src/services/paidCallService.js`: 20% platform deduction.
- `OnlyMe-backend/src/constants/publicationConstants.js`: `PREMIUM_CREATOR_PAYOUT_SHARE = 0.68`; `premiumWorldPricingService.js` uses this for displayed payout estimates. Actual membership transfers use the full charged amount, so estimate and settlement disagree.

**Implement:** Separate immutable creator valuation (10 coins = $1) from channel-specific fan purchase prices. Remove the Direct Access deductions and the 68% World estimate. Apply the any-channel promise consistently to retained paid calls; the document does not separately describe their future product scope. Preserve historical monetary values rather than revaluing past earnings when settings change. Plan a migration/reconciliation for old rates, old deductions and already pending obligations.

Example: 100 coins spent on Direct Access must earn $10, rather than $9 or $8. A 190-coin World payment must show $19 creator earnings, rather than a $12.92 estimate.

## 2. Coin purchase prices and packs: critical

**Requirement:** Web 100 coins = $14.99 plus tax; app 100 coins = $19.99 including tax. Ten coins cost $1.49 web / $1.99 app. Pack sticker prices end .49 or .99. Ten-coin pack is app-only; maximum base pack is 5,000 coins.

**Current:** `walletController.js` defines dollar packs $4.99/$9.99/$29.99/$49.99/$99.99/$249.99. Base coins are `round(pack.usd * starsPerUsd)`, using the same rate as creator valuation. There is no purchase-channel catalogue. At the default rate, $9.99 buys 100 base coins plus 5 bonus coins: this does not match the new web/app prices.

**Implement:** A server-owned, versioned catalogue with pack ID, base coins, channel, price/currency, tax treatment and bonus policy. Charge and credit from this catalogue; do not derive fan coin credits from the creator exchange rate. Update Wallet and contextual insufficient-balance purchase flows together.

Prototype base packs are 10/50/150/500/1,200/2,500/5,000, with 10 removed on web. Confirm the approved full price table before shipping: the prototype's final rounding function evaluates 100 coins to $14.99 web / $19.99 app, but its displayed ten-coin rate multiplied by ten is $14.90/$19.90. Do not silently use a linear formula for every pack.

The contextual prototype top-up rounds the shortfall up to ten coins; current `exactStars` accepts any positive integer and prices it using the creator rate. Align this path with the approved catalogue/rounding policy and store products.

## 3. Real checkout and mobile purchases: critical

`walletController.js::topUpWallet` immediately credits coins with `temporaryCheckout: true`; it does not await a successful payment. This is a prototype transaction path even though it writes real ledger entries outside TEST mode.

Implement web Stripe checkout/payment confirmation, Stripe Tax integration as required, verified provider events, purchase records, payment-to-ledger reconciliation and refund/chargeback handling. Credit once only after verified payment; keep test transactions isolated. Tax/OSS operating setup is also a finance dependency, not merely UI text.

The mobile Settings screen currently opens web `/wallet`; its package does not include a native purchase SDK. Implement store products, native purchase flow, server receipt/transaction verification, channel pricing and store lifecycle events. The existing Stripe Identity integration is not proof of a working coin checkout or payout processor. Confirm the store revenue/fee assumptions stated in the document with finance before launch.

## 4. Bonus coins: partial foundation, substantial gaps

**Requirement:** Web pack bonuses only, maximum 10%; first-pack welcome bonus 10% capped at 50 coins. Spend bonus coins first; expire after 90 days; no cash refund or direct withdrawal of bonus coins. Creators still earn the full fixed value when fans spend them.

**Current:** Separate bonus/purchased/earned buckets exist and bonus is spent first. Withdrawals use earned balance, excluding a fan's unspent purchased and bonus coins. However:

- Pack bonuses are hardcoded absolute values (0/5/20/50/150/500), unrelated to the approved pack ladder and channel.
- No first-paid-pack welcome award is implemented in the top-up path.
- No bonus grant/lot expiry accounting or 90-day expiry enforcement appears in this flow.
- Refund bucket restoration can restore bonus-funded amounts to the bonus bucket (`creditBuckets` in `walletLedgerService.js`). This requires an explicit interpretation of the non-refund rule.

Implement dated bonus grants, atomic first-purchase eligibility, channel restrictions, expiry during spending and scheduled cleanup, and audit entries for expiration. Decide whether a reversed content purchase may restore unexpired promotional coins while prohibiting cash refunds; do not assume these are the same policy. Never turn a bonus restoration into purchased/cash-withdrawable funds.

The prototype shows web bonuses 0/0/25/96/250/500 on 50/150/500/1,200/2,500/5,000 base packs (0/0/5/8/10/10%). The PDF abbreviates this as 0/0/5/8/10%; approve a single catalogue. Its app pack bonuses are zero, while the welcome bonus remains available.

## 5. Payout processing: major missing capability

| Requirement | Current code | Work required |
|---|---|---|
| Monthly automatic payment on the 1st, minimum $20, default on | Default-on preference persists; API explicitly returns `automaticProcessingAvailable: false` | Scheduled payout batches, eligible balance selection, $20 minimum, deduplication, next payment date and execution |
| Requested payout from $50, free, 3–5 days | $50 and zero-fee standard request exist; earned balance is debited into `PENDING_ADMIN_PROCESSING` | Actual transfer execution, provider status, expected arrival, failed/returned payout recovery and reconciliation |
| Instant debit-card payment, 1%, minimum fee $0.50 | Backend rejects non-standard methods; UI disables instant | Debit-card eligibility/tokenization, fee quotation and net amount, provider execution and lifecycle handling |
| Bank/provider setup | Admin-reviewed encrypted bank applications; manual payout readiness | Resolve manual workflow versus intended provider-connected workflow, then implement the approved processing model |

Relevant files: `walletController.js`, `manualBankService.js`, `PayoutBankApplication.js`, `src/components/financial/PayoutFlow.jsx`, and `OnlyMe-backend/docs/bank-payouts.md`.

Do not enable the automatic or instant labels as a substitute for implementing transfers. A saved preference and bank approval do not move money. Payout requests need durable states and recovery so a failed transfer does not permanently consume the creator's balance.

## 6. Clearing by trust: missing tiers

The PDF requires New = 14 days for the first 60 days, Trusted = 7, Top = 3, with no percentage reserve. Current Wallet calculation and withdrawal validation both hardcode 14 days. There is no tier selection in those paths. No percentage reserve was found there, so avoid adding one.

Implement one shared clearing policy for balance display, requested payouts and monthly runs, preferably recording release times for individual earnings. Define Trusted/Top eligibility and downgrade behavior; the PDF names the tiers but does not fully specify promotion criteria. Income-to-coins currently has a separate 24-hour hold: confirm whether this is intentionally different from cash withdrawal clearing.

## 7. Referral money: direct conflict

The PDF says invites give status only: no referral cash or coins. `referralFinancialService.js` actively awards 5% earned-balance credits for eligible purchases/gifts, invoked by `transferStars`. This is active financial logic, not only legacy copy.

Disable future financial awards across invitation paths; remove cash/coin promises and projections from Grow/invite/admin surfaces. Preserve historical ledger/audit records and decide how existing earned rewards and reversals are handled. Do not delete old transactions to hide them.

## 8. Age, verification, spending and country gates

Already present: adult checks in monetization eligibility, seller verification checks, configurable payout-country support, Wallet spending counter, a user-set monthly limit up to $1,000 and transactional spending-limit enforcement.

Still required or needing alignment:

- Gifts/Dream should support the specified pre-verification earning allowance up to $500, then the stated 30-day grace period. The current monetization summary has no corresponding cumulative threshold/grace state and can require an approved bank when no supported-country list is configured.
- Separate lightweight seller information from identity verification; retain private/Only-you visibility until required verification is complete. Existing seller checks rely on approval status; do not mistake this for the full staged onboarding rule.
- Trigger required identity verification at first withdrawal or $500. Existing Stripe Identity code and manual approvals need a consistent role in this policy.
- Apply 18+ checks to purchase/spend entry points too: the top-up handler itself has no birthday gate. Receiver eligibility alone does not verify the fan's age.
- Implement web-card daily purchase limits: $100/day during the first seven days, $500/day after; keep store purchases exempt. Monthly wallet spending limits are a different control.
- Current spending dollars use `coins / creatorRate`, so they reflect creator valuation rather than the new fan purchase price. Approve the definition of spending/limits for purchased and bonus coins, then use it consistently in display and enforcement.
- Provider-supported bank countries and explicit restrictions need consistent enforcement on money entry points. An admin country list is not by itself evidence of the complete prohibited-country policy. Ukraine/CIS via Payoneer/Wise is explicitly unresolved in the document.

## 9. Earnings retention and account deletion: largely present

No ordinary earned-balance expiry was found. `accountOwnershipService.js` calculates unwithdrawn dollars and requires acknowledgment before deletion with earnings; deletion has a 30-day grace period. The deletion worker preserves financial/audit records and makes the account unusable, rather than explicitly posting an earnings cancellation ledger entry.

Keep the existing warning. Define and audit the point at which remaining earnings are cancelled, and reconcile any pending transfers before final deletion. Retaining financial records is compatible with cancelling withdrawal entitlement; deleting records is unnecessary.

## 10. Gift catalogue and money-screen copy

- Gifts/categories already come from admin-managed data. The Gift model allows 1–1,000,000 coins, so code does not enforce the specified 5–5,000 ladder or tier boundaries: Everyday 5–20, Warm 25–90, Big 100–280, Legendary 300–950, Vault 1,000–5,000. Compare the actual configured catalogue before migrating; its production records were not inspected. Preserve approved gift coin prices; changing fan pack prices is not permission to reprice gifts.
- Keep creator earnings, payout estimates and income activity in dollars. Remove percentage/split disclosures and generic creator rate displays; use the fixed promise only in How payouts work, the dashboard line and terms.
- The Wallet coin balance currently shows a dollar equivalent using creator valuation; clarify or replace this so it does not imply fan purchase cost or cash redemption value.
- Pack UI currently shows a total including bonus and also appends `+ bonus`; display base coins plus bonus clearly to avoid apparent double counting.
- Keep spending counter and spending-limit link in Wallet (already there). Use coin assets/components in money UI.
- Keep web-price promotion out of native app copy. Review mobile-to-web Wallet links against the approved regional store implementation before shipping; the attachment itself leaves external-link fees unresolved.

## 11. World subscriptions: existing work to retain

`premiumMembershipService.js` already has half-price first-period calculation when enabled, real membership period dates, renewal processing, cancellation at period end, three-day reminders and cancellation/renewal email calls. These should not be estimated as entirely new work. `membershipReceiptService.js` also provides a cancellation notification/email path.

Verify end-to-end delivery, retry behavior and the required cancellation/manage entry points. Renewal reminders currently search a narrow one-minute date window with a 200-record limit; assess missed-run/catch-up and batch handling before relying on it at launch. The service defines a month as 30 days; confirm whether the intended subscription period is 30 days or a calendar month. Fix creator payout estimates independently of this already implemented lifecycle.

## Recommended implementation order

1. Finalize the pack/tax/bonus table and remaining product definitions; freeze the creator rate. Disable future referral rewards and remove contradictory earning calculations with a migration plan.
2. Implement verified web payments and native store purchases, with channel-aware prices and purchase limits. Remove temporary unchecked crediting from production paths.
3. Implement bonus grants/expiry, consistent fan spending valuation and the staged age/seller/verification/country rules.
4. Build payout execution and reconciliation, monthly $20 runs, requested $50 payments, trust-based clearing and instant debit-card payments.
5. Align UI/copy, gift catalogue and deletion accounting; verify subscription delivery and cancellation flows.

Acceptance checks should cover fixed earnings across every channel and bonus-funded purchase; duplicate/failed provider events; first-purchase bonus races and expiry; mixed-source refunds; daily/monthly limits; $19.99/$20 and $49.99/$50 payout boundaries; clearing-tier transitions; concurrent automatic/manual payouts; failed-transfer restoration; and historic ledger reconciliation.

## Decisions that must remain explicit

- Exact approved pack prices and store products, bonus ladder and welcome eligibility.
- Trust promotion/downgrade criteria and whether income conversion uses cash-clearing rules.
- Definition of the $500 verification threshold/grace period and the dollar basis for fan limits.
- Bonus treatment on reversals versus cash refunds.
- Payment/payout provider model, supported bank countries and unresolved Ukraine/CIS options.
- Historical earnings/referral treatment and account-deletion cancellation accounting.

This review identifies implementation gaps against the supplied materials. It does not certify payment-provider eligibility, current store rules, tax compliance, deployed configuration, live catalogue contents or successful movement of real money.
