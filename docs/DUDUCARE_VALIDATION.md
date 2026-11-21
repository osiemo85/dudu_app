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
