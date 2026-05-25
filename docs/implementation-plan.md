# Fitness Tracker Backend Persistence Implementation Plan

This plan follows `docs/migration-localStorage-backend.md`. Each implementation phase should become one commit using the conventional commit format:

```txt
<action>(<scope>): description
```

Small setup-only and test-only commits have been merged into code-changing phases. Testing is handled as validation inside each phase, not as a standalone phase.

## Phase 1: Backend Fitness Persistence Foundation

Commit:

```txt
feat(fitness-tracker): add backend activity persistence support
```

Goal:
- Make the backend runnable for the fitness tracker module.
- Add the activity read endpoint required by the frontend service.
- Protect the one-steps-log-per-date product rule at the backend layer.

Changes:
- In `2_backend_practice/src/app.js`, temporarily comment out imports and `app.use(...)` route mounts that point to modules that do not currently exist.
- Keep the commented route sections visible and grouped so they can be restored soon.
- Keep `/api/v1/fitness-tracker` and other currently available routes active.
- Add `GET /api/v1/fitness-tracker/activities`.
- Add `fitnessTrackerService.getActivities()`.
- Return:

```js
{
  activities: []
}
```

- Sort activities consistently, preferably latest first by `loggedAt`.
- Keep current `GET /api/v1/fitness-tracker` overview behavior.
- In `createActivity(activity)`, check for an existing `{ type: 'steps', date }` before insert.
- Return a clean `409 Conflict` when a duplicate daily steps log is attempted.
- Optionally add a partial unique index on `{ type, date }` for `type: 'steps'`.
- Catch duplicate-key errors if the index is used.

Validation:
- Start the backend and confirm it boots without module-not-found errors.
- Confirm `GET /` returns the existing backend health response.
- Confirm `GET /api/v1/fitness-tracker/activities` returns `{ activities }`.
- POST one `steps` activity for a date and confirm success.
- POST another `steps` activity for the same date and confirm `409 Conflict`.
- Confirm workout logs for the same date are still allowed.

## Phase 2: Shared Frontend Fitness Service And Migration

Commit:

```txt
feat(fitness-service): add api-backed activity store
```

Goal:
- Add the shared frontend service that becomes the single activity-log access point.
- Preserve existing user data from `fittrack_logs` through one-time migration.

Changes:
- Add `1_FRONTEND/js/service/fitness-service.js`.
- Expose a global `window.FitnessService`.
- Implement:
  - `loadActivities(options)`
  - `getActivities()`
  - `createActivity(activity)`
  - `deleteActivity(id)`
  - `migrateLocalLogsToBackend()`
  - `findDuplicateStepsForDate(date)`
- Read fallback:
  - If backend load fails, read `fittrack_logs` from localStorage.
- Write behavior:
  - POST and DELETE must be API-first.
  - Do not fallback to localStorage writes.
  - Throw or return a clear error for the page script to display.
- Implement first-load migration using `fittrack_logs_migrated_v1`.
- Fetch backend activities before migration.
- Compare local and backend records by `id`.
- POST missing local records.
- Treat duplicate conflicts as non-fatal during migration.
- Refresh backend activities after migration.
- Set migration marker after migration completes.
- Keep `fittrack_logs` as a temporary backup.

Validation:
- Load the service from a browser page.
- Confirm it can fetch activities from the backend.
- Confirm it falls back to localStorage on read failure.
- Put sample logs in localStorage and confirm missing records are migrated to MongoDB.
- Reload and confirm migration does not duplicate records.
- Confirm create/delete errors do not mutate localStorage.

## Phase 3: Fitness Tracker Page API-First Refactor

Commit:

```txt
refactor(fitness-tracker): use shared fitness service
```

Goal:
- Move `fitness.js` away from direct `fittrack_logs` persistence while preserving the current page behavior.

Changes:
- Load `../js/service/fitness-service.js` before `../js/fitness.js` in `fitness-tracker.html`.
- Refactor `fitness.js` to hydrate logs via `FitnessService.loadActivities({ migrate: true })`.
- Keep page-specific DOM rendering logic in `fitness.js`.
- Change `logWorkout()` and `logSteps()` to call `FitnessService.createActivity(...)`.
- Keep the frontend duplicate steps check using `FitnessService.findDuplicateStepsForDate(date)`.
- Change delete confirmation to call `FitnessService.deleteActivity(id)`.
- Update in-memory state and DOM only after successful backend calls.
- Preserve existing alert messages where possible.
- Keep profile, goals, water, reminders, and nutrition state in localStorage.

Validation:
- Load the fitness tracker page with backend available.
- Confirm historical logs render from backend data.
- Confirm one-time local migration still runs on the fitness page.
- Confirm workout create, steps create, duplicate steps rejection, and delete work.
- Stop the backend and confirm create/delete show errors and save nothing.
- Confirm read fallback can still render existing local logs during backend development.

## Phase 4: Downstream Fitness Consumers And Notification Cleanup

Commit:

```txt
refactor(fitness-consumers): read activities from fitness service
```

Goal:
- Stop fitness-related pages from reading `fittrack_logs` directly.
- Remove the fragile notification page dependency on `fitness.js`.

Changes:
- Load `../js/service/fitness-service.js` before consumer scripts where needed.
- Update `dashboard.js` to wait for `FitnessService.loadActivities()` before computing fitness metrics.
- Update `progress-charts-wiring.js` to use `FitnessService.getActivities()` or loaded activities.
- Update `insights.js` shared log functions to use `FitnessService`.
- Stop loading `fitness.js` on `notification.html` if only shared insights/log helpers are needed.
- Load `fitness-service.js` and `insights.js` on notification pages as needed.
- Move any remaining shared log or insight functions out of `fitness.js` before removing the dependency.
- Keep non-fitness localStorage reads unchanged, including goals, profile, water, reminders, and nutrition planner state.

Validation:
- Confirm dashboard numbers match the previous localStorage-backed behavior for the same data.
- Confirm progress charts render with backend-loaded activity logs.
- Confirm insights still show expected activity-based messages.
- Open the notification page and confirm there are no missing fitness-tracker DOM errors.
- Confirm notification page behavior remains unchanged.

## Verification Cadence

Before each commit:
- Run the validation checks listed in that phase.
- Run available backend tests if the touched backend area has coverage.
- Manually verify the affected browser pages when frontend scripts or HTML script order changes.

After Phase 4:
- Run the full manual migration flow:
  - backend startup with temporary route comments
  - activity list endpoint
  - one-time local migration
  - workout create
  - steps create
  - duplicate step conflict
  - delete
  - dashboard, progress chart, insight, and notification consumers

