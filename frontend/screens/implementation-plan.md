# ValuTir screens and implementation plan

This directory contains static screen concepts for ValuTir. The app has one account and one subscription engine, with Personal and Business views. These mocks are references for future implementation, not live React routes.

## Kept screen set

1. [Public homepage](1%20public-homepage.html): explains recurring-expense tracking, trial reminders, renewal visibility, the free allowance, business tools and the `/register` path.
2. [Empty personal dashboard](2%20empty%20personal-dashboard-after-creating-account.html): first logged-in state with no tracked services.
3. [Personal dashboard](3%20personal-dashboard-with-business-switch.html): recurring totals, near-term charges, trial priority, household-shared services, review queue and sortable inventory. Personal/Business switching is in the shared account header.
4. [Business dashboard](4%20business-dashboard-switch.html): the same inventory filtered to Business, with monthly equivalent, trial and annual-commitment priorities.
5. [Add subscription](5%20add-subscription.html): one form for both contexts; Personal or Business defaults from the dashboard that opened it and remains editable before saving.
6. [Edit subscription](6%20edit-subscription.html): one form for both contexts; starts with the record's existing context and can move it to the other view when saved.
7. [Subscription details](7%20personal-subscription-details.html): price, renewal date, status, household/provider details and actions.
8. [Remove subscription](8%20remove-personal-subscription.html): distinguishes archiving in ValuTir from cancelling with the provider; records usefulness and cancellation context.
9. [Cancelled subscription](9%20cancelled-subscription.html): keeps the past record and lets the user record a confirmed restart.
10. [Renewal review](10%20renewal-review-screen.html): self-reported usage/value, cost impact, user-selected decision and a reminder; does not cancel on the user's behalf.
11. [Personal calendar](11%20personal-calendar.html): date-based view with status/category/cadence filters.
12. [Selected calendar day](12%20selected-calendar-day.html): lists subscriptions due on a selected date and links to details.
13. [Profile currency](13%20personal-profile-currency.html): saved default display currency, with original subscription amounts retained.
14. [Plans and one-time upgrade](14%20plans-and-business-upgrade.html): both views stay free through 50 active subscriptions combined; a one-time unlock covers more than 50 and/or advanced small-business tools. Amount and exact package remain undecided.

## Shared page chrome and visual system

- Use [header.html](partials/header.html) and [footer.html](partials/footer.html) as the shared HTML partials. Each screen embeds them in a small iframe so the mocks remain standalone files without a build step.
- The header partial uses a visitor menu on screen 1: How it works, For business, Free plan, Sign in and Try it out. Logged-in screens use Subscriptions, Calendar, Profile, Plan, an account avatar and the Personal | Business switch. Active navigation and current context are URL parameters on the partial.
- Use a full-height flex shell: the content area grows on short screens and pushes the shared footer to the viewport bottom; longer screens scroll naturally with the footer after the content.
- The dashboard context switch navigates between screens 3 and 4. The subscription context selector in screens 5 and 6 is separate: it controls where that record appears, not which dashboard the user is currently browsing.
- Keep [personal-screens.css](personal-screens.css) as the common app shell, typography, colors, spacing and component baseline. Screen-specific styles may arrange content but should use the same warm white surfaces, muted green actions, amber trial warning, borders and type scale.
- Use the same shared footer on visitor and logged-in screens, with links varied by mode. Do not add a separate header/footer implementation to individual mockups.
- Service icons live in [icons](icons/). Keep text labels beside icons and use empty alt text for decorative marks.

## Mobbin references informing the public homepage

- [Monarch homepage hero](https://mobbin.com/sites/sections/24964640-6293-40e9-994e-591814a32ec5): concise promise, primary CTA and product preview.
- [Origin tracking feature section](https://mobbin.com/sites/sections/03bfcd15-d27c-4a56-bc79-f4eecb51561b): demonstrates tracking capabilities through distinct interface examples.
- [Monarch feature overview](https://mobbin.com/sites/sections/484401ea-fc2f-400e-9069-107ed3dcf00d): makes capabilities scannable around a central product visual.
- [Unify pricing comparison](https://mobbin.com/sites/sections/38e80f31-c10c-4125-bfee-59225009e65e): separates free and paid capabilities; ValuTir adapts the hierarchy to a free allowance and one-time unlock rather than recurring SaaS pricing.

## Mobbin references informing logged-in workflows

- [Rocket Money recurring screen](https://mobbin.com/screens/10e4c041-cc08-41c0-a605-4424dc5486b8): persistent recurring destination, upcoming/all/calendar navigation, search and cancellation help.
- [Origin recurring payments screen](https://mobbin.com/screens/1b1b0baf-4c9a-472d-b2cc-2542f1920b18): calendar/list modes, date navigation and totals paired with upcoming items.
- [Monarch recurring screen](https://mobbin.com/screens/81d43f42-9729-4a1a-a191-2d91e65f83f1): period summary, payment status and a visible review prompt.
- [PayPal recurring series list](https://mobbin.com/screens/57175a8b-eea5-43e0-9723-d9560c3a8d02): scannable list with cadence, next occurrence, status and amount.
- [Ubank renewal editor](https://mobbin.com/screens/f78c0ae3-c163-40e8-ada1-ff876f8ec077): amount, cadence, due date and reminder in one edit flow.
- [Ten Percent Happier trial detail](https://mobbin.com/screens/ae1145a9-a59a-4f34-ac3c-78d28ad88ce8) and [Canva trial notice](https://mobbin.com/screens/723a3935-81ba-4c75-9bc2-f1a0643dba26): exact trial end and the charge that follows are made explicit.
- [Quicken bills calendar](https://mobbin.com/screens/c904e240-11fc-4978-b756-60885d26e330): calendar beside upcoming items and period context.
- [Stripe subscriptions table](https://mobbin.com/screens/b146b872-6244-4126-8e6d-7f76e1ac5b93): status filters and a dense inventory for larger subscription counts.
- [Hims cancellation confirmation](https://mobbin.com/screens/5b1982da-4aed-4847-af0a-0ab9e79b2ad5): states the consequence and remaining access period before confirmation.

## Product and data rules

1. Keep one user account and one subscription table. `b2b=false` means Personal and is the database default; `b2b=true` means Business. Do not classify the whole account as one audience.
2. A subscription belongs to exactly one context. Screens 5 and 6 expose Personal / Business, defaulted from the active dashboard on add and from the record's existing context on edit. Saving a context change moves the record between dashboard filters.
3. Keep switching views free. Both dashboards and core tracking remain free for up to 50 active subscriptions combined across Personal and Business. Archived/cancelled records do not consume the allowance.
4. A single one-time purchase unlocks tracking beyond 50 and/or the approved advanced small-business feature bundle. There is no recurring software charge. Do not show a price until it is decided. Preserve read, edit and archive access at the free limit.
5. Core business tracking remains free. Project/cost-center allocation and bookkeeping export are possible paid extras, but are not represented by the `b2b` boolean and are not in the first data-model release.
6. Put trial end date and first charge amount/date together. Prioritize trials in the dashboard and remind before conversion. State that ValuTir tracks and reminds; cancellation happens with the provider.
7. Separate a user's review intent from the provider subscription state. “I plan to cancel” does not mark the service cancelled. Keep charges visible until the user confirms provider cancellation or the recorded end date passes.
8. Show projected recurring costs only. There is no payment ledger, so do not claim actual spending or past savings. Any savings example is a calculation from the displayed subscription price and must be labeled as an example.
9. Preserve each subscription's original currency. Do not combine currencies into a precise total until a reliable exchange-rate source, timestamp and stale-rate behavior are agreed.
10. Household-shared services show the full bill in Personal totals until member splits are modeled. The household-shared field is hidden in Business context.

## Implementation order

### 1. Shared shell and visual foundation

- Build the React header and footer from the two HTML partials. Give visitor routes the marketing menu and protected routes the account menu with Personal | Business context switching.
- Align shared MUI typography, page width, card surfaces, borders, muted green actions, amber trial states, spacing, focus and responsive behavior with [personal-screens.css](personal-screens.css).
- Keep a single shell on public and authenticated routes; active nav and dashboard context come from route/app state.

### 2. Account-scoped context field

- Add `b2b` to the Doctrine `Subscription` entity and create a new migration with default `false`; existing records remain Personal.
- Add `b2b` to write DTO constraints, explicit service mapping, API serialization and `frontend/src/types/subscription.ts`. Keep all queries scoped to the authenticated owner.
- Add a Personal / Business choice in create/edit. Default new records from the active dashboard, and edits from the current record. Validate the boolean at the API boundary; do not trust user ID or ownership from the form.
- Expose both contexts from the shared subscription API and filter in the frontend; never create duplicate subscription records for context switching.

### 3. Logged-in dashboard and inventory

- Build screens 2–4 with one shared dashboard/list component and context-specific summary cards.
- Personal leads with next-seven-day cost, trial ending soon, monthly equivalent, household-shared count, trial count and active count.
- Business leads with upcoming charges, trial conversion, monthly equivalent, annual commitments in the next 90 days and active business count.
- Keep Needs attention above a single sortable inventory. Do not duplicate upcoming subscriptions in a separate list. Use exact dates, charge amounts and text status labels.
- Preserve clear empty, loading, error and filtered-no-results states.

### 4. Add/edit and detail actions

- Build screen 5 with required service/price/currency/cadence/next date, optional provider details, auto-renew, notes and household sharing for Personal. Show normalized monthly/yearly cost and trial first-charge preview.
- Build screen 6 with editable fields and context. Saving only changes ValuTir's record; it does not modify the provider plan.
- Build screen 7 details, screen 8 archive/removal and screen 9 cancellation/re-enable states. Keep archival distinct from provider cancellation and retain useful cancellation context.
- Build screen 10 renewal review with self-reported usage/value, annualized cost, transparent suggestion, decision choices and a save/reminder action. Save review intent separately from the provider lifecycle state.

### 5. Calendar and profile

- Build screens 11–12 with month navigation and status/category/cadence/active-only filters. The selected-day list uses the same filtered subscription records and opens details.
- Build screen 13 profile currency preference. Keep original amount/currency in every record and format display consistently. Add exchange conversion only after rates and stale/missing-rate behavior are reliable.

### 6. Public homepage and signup path

- Replace the placeholder `frontend/src/pages/HomePage.tsx` with screen 1. Explain what users track, show cost/date/trial/review capabilities, make the free promise specific, and link “Try it out” to `/register` and Sign in to `/login`.
- Keep the trial promise precise: show the first charge and remind before conversion. Do not say the app can prevent the charge, cancel a vendor subscription, or detect services automatically unless those capabilities exist.
- Show the free allowance as 50 active subscriptions combined. Explain the one-time unlock for higher volume and approved business extras; identify the amount as undecided until set.

### 7. One-time entitlement and business extras

- Decide the one-time amount, exact included tools, refund/receipt behavior, what counts as active, and whether advanced business features can be purchased before reaching 50.
- Keep paid entitlement separate from `b2b`. Enforce the 50-record cap account-wide; at the cap, allow reading, editing, reviewing and archiving existing records, while requiring the one-time unlock to add a 51st.
- Model any project/cost-center allocations separately from subscriptions and `b2b`; decide whether one subscription can split across projects before designing that schema.
- Do not add payment processing or entitlement enforcement until the offer and feature bundle are finalized.

## Current implementation constraints

- Frontend: React 18, TypeScript, React Router and MUI, with shared `AppHeader`, `AppShell`, subscription pages and FullCalendar.
- Backend: Symfony 7.4 JSON API, Doctrine `Subscription`, DTO, service and user-scoped repository queries.
- Subscription cadence and next billing date already exist. General reminder delivery does not; `trialReminderSentAt` is trial-specific. The homepage's reminder presentation depends on implementing scheduled, idempotent delivery.
- No payment-event ledger exists. Show recurring projections, not historical spend.
- Currency conversion uses placeholders today; keep mixed-currency values separate until reliable conversion is implemented.
