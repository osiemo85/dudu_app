# Duducare validation

Validated on 2026-11-21 using an isolated SQLite database and an empty OpenAI key;
no live agricultural API or external model was used for these checks.

- Frontend ESLint and TypeScript checks pass.
- Production compilation, type checks and prerendering pass. Next.js 16.4.2 emits
  a security advisory; its build can stop once to show the advisory and succeeds
  when retried. Upgrade the existing dependency before production deployment.
- Three focused integration tests in `backend/tests/test_duducare.py` pass:
  chat context/chemical boundaries/provenance, independent local advisory flows,
  and private saved-plan snapshot/observation access with no-store headers.
- Five existing planting-engine tests pass.
- Chromium browser checks pass for main routes at 375×812, 812×375, 768×1024 and
  1440×1000 without horizontal overflow. Both advisory forms submit successfully;
  chat asks for missing context and refuses pesticide instructions; device notes
  survive reload. No JavaScript page errors occurred in the flow checks.
- Registration, saving a growing-plan snapshot, adding an observation and loading
  that observation after reload were verified through the mobile browser UI.
- Production service-worker registration and the offline navigation explanation
  were verified with the browser network disabled.

The repository's broad pre-existing test suite is not fully passing. An isolated
checkout of the starting HEAD had 10 failures and 6 errors across 31 tests,
including disconnected planting routes, old registration expectations, admin
requests without authentication and stale agent-response mocks. After restoring
planting, the initial broad run had 9 failures and 2 errors. These are recorded
as existing-suite limitations rather than being hidden by weakening account or
admin checks. Focused new tests exercise the current registration contract.

Manual follow-up: check install UX in Safari/iOS and Android, assistive technology
reading order, real-device camera permissions, and stakeholder review of the
simulated guidance before treating this demo as operational.

## Profile and language review — 2026-11-21

The account modal is available below “A little care. A better harvest.” in the
sidebar and through the phone header. It includes editable name, read-only email
and role, language controls, private record links and logout. English/Kiswahili
is also available in the shared header before login. Existing evidence and older
advisory output retain their source language, as disclosed by the Swahili banner.

This review fixed language changes resetting an unsaved profile name, and an open
modal becoming hidden when resizing across the sidebar breakpoint. Dialogs now
render outside responsive navigation containers. Profile save/logout show distinct
progress, and account errors and success messages follow the chosen language.

Verified with Chromium against a separate FastAPI service using an isolated SQLite
database and no model key. Browser requests were forwarded to that test service;
no production account or database was used:

- Register and log in through the translated forms; edit and save the profile;
  verify the new name after reload and after logging in again.
- Switch language before login and inside the modal; preserve the unsaved name
  during switching; retain the preference after navigation, reload and logout.
- Escape closes the dialog and restores focus. Open dialogs remain visible without
  horizontal overflow at 375×812, 812×375, 768×1024 and 1440×720.
- Both crop identification (Tomato, Kiambu/Thika, Long rains, written symptoms)
  and planting (Machakos/Kangundo, Short rains) submit and show structured results
  independently without login. No JavaScript errors in the account browser flow.
- ESLint, TypeScript and `git diff --check` pass.
- Nine focused backend tests pass across `test_profile.py`, `test_animal_health.py`
  and `test_duducare.py`. New profile tests cover authentication, invalid names,
  immutable identity/role, persistence, revoked-cookie rejection and origin checks.

Run the profile regression tests from `backend` with
`.venv/bin/python -m unittest discover -s tests -p 'test_profile.py'`.
The earlier broad-suite limitations above remain outside this account/UI review.

## Compact navigation revision — 2026-11-22

This revision replaces the earlier large profile modal. `/health` now has two
compact linked rows rather than large action cards. Sidebar promotional text is
removed. The circle-only avatar opens a roughly 304px account popover with the
name above Profile, Settings and Log out. Profile and Settings navigate to
`/profile` and `/settings`; `/proflile` redirects to `/profile`. The standalone
profile page retains authenticated name editing, and settings retain persistent
English/Kiswahili switching for guests and signed-in users.

Chromium checks against isolated SQLite/FastAPI passed at 375×812, 812×375,
768×1024, 1024×720 and 1440×1000: compact menu bounds, avatar-only trigger,
profile/settings navigation, guest handling, profile persistence, language
persistence, logout, Escape/focus return and outside-click dismissal. No browser
JavaScript errors occurred. Independent crop and planting submissions also passed.
Frontend ESLint, TypeScript and whitespace checks pass. Backend account behavior
is unchanged by this UI revision.

## Header installation and admin workspace — 2026-11-22

The install promotion banner is removed. A labeled download icon is the last
header action, after English/Kiswahili. It opens a browser install prompt when
available or a compact instruction dialog. Installed apps hide the control;
offline feedback remains visible. Administrators have an Administration sidebar
link and the same destination in the phone account menu.

The admin workspace uses compact database tabs on larger screens, a labeled
database selector on phones, searchable records, fixed review-status filters,
status badges and mobile record cards. Saved county/area and season fields are
displayed in the case list. Loading, errors and empty results have distinct
states. JSON evidence is expandable. Dialog effects no longer queue a close
event during React Strict Mode's development checks.

Chromium checks passed using an isolated SQLite/FastAPI service with optional
local fixtures and no OpenAI key; the configured application database and real
accounts were not changed:

- No horizontal overflow at 320×740, 375×812, 768×1024, 812×375, 1024×720 and
  1440×1000; installation follows the language controls at each width.
- Install fallback, simulated native prompt, Escape dismissal, translated install
  label, offline feedback and installed-state hiding passed.
- Admin login, sidebar navigation, case details, saving a review note/decision,
  pending/approved filters, search and empty-result recovery passed.
- Contributor source creation and editing passed. Guests and ordinary farmers
  have no visible admin link; the workspace still requires administrator access.
- Independent disease and planting forms returned structured results from the
  documented sample inputs without an AI provider. Unconsented disease requests
  remained unsaved. No browser JavaScript errors occurred.

ESLint, TypeScript, API response tests, focused backend manual-disease and
Duducare tests, and whitespace checks passed. PostgreSQL-only tests were skipped.
The production build passed after the existing Next.js security reminder; the
installed Next.js version still reports an upgrade warning. Native installation
on physical iOS/Android devices remains a manual follow-up.

## Compact navigation and language selector — 2026-11-22

Small-screen navigation now shows icons with accessible names and labels on
hover or keyboard focus. Escape dismisses a label without moving focus. Admin
accounts have a sixth icon for Administration; guests and farmers retain five.
Desktop sidebar labels remain visible. The header and Settings use a compact
EN/SW native dropdown with full language names in its options. Help is a visible
text link, and installation remains the final header action.

Chromium checks passed at 320×740, 375×812, 768×1024, 812×375, 1024×720 and
1440×1000 for layout bounds, accessible navigation names, 44px mobile targets,
tooltip hover/focus/Escape, the admin destination, Help visibility and install
ordering. Language changes persisted after reload. Both advisory forms completed
against the isolated local fixture service without an AI provider. Install-help,
offline and installed-state checks also passed, with no JavaScript page errors.
ESLint, TypeScript and whitespace checks passed.

## Persistent expert messages and optional profile location — 2026-11-22

`/profile` now saves optional, manually entered county and area. `/chat` now
provides private conversations with selected database admin/expert accounts;
the original scripted assistant remains separate at `/chat/assistant`.
Messages persist in the configured database, with participant ownership checks,
retry identifiers, paginated history and explicit read progress. Unread totals
are shared by desktop/mobile navigation and checked regularly while visible.

Validated against isolated SQLite and PostgreSQL 18 databases, without changing
real accounts or sending messages to real users:

- All 15 messaging/profile/migration tests passed, including both database
  implementations, participant privacy, a non-participant admin, idempotent
  retries, incoming messages arriving after a fetch, monotonic read markers,
  large PostgreSQL IDs and restart-preserved history/read progress.
- Six PostgreSQL connection/account regression tests passed. Profile, manual
  disease, Duducare, animal-health and saved-plan tests also passed; the separate
  PostgreSQL manual-disease suite was not rerun for this feature.
- Fresh Alembic upgrades reached `20261122_02` on both engines, with no seeded
  accounts or messages. Repeated additive initialization preserved records.
- Two independent Chromium sessions selected an expert by area, saved/reloaded
  profile fields, exchanged messages, reopened saved history and showed/cleared
  unread counts on both sidebar and mobile icons. A dropped response after a
  committed send retained the draft and produced only one message on retry.
- History longer than 50 messages loaded previous pages. New arrivals stayed
  unread while reading earlier history, then cleared on reaching the bottom.
- Chat layouts passed at 320×740, 375×812, 768×1024, 812×375, 1024×720 and
  1440×1000 with no horizontal overflow. The composer cleared the mobile bar,
  including landscape. No browser JavaScript page errors were observed.
- Independent disease and planting submissions still returned structured
  results using the documented local fixtures, without an OpenAI key.

ESLint, TypeScript, API response tests, whitespace checks and the production
build passed. The build continues to report the installed Next.js version's
existing security-upgrade warning. Real deployment credentials, professional
expert credentials, delivery/response guarantees and native push notifications
are not established by these local checks.
