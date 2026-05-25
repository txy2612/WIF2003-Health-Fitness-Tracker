# Fitness Tracker localStorage to Backend Migration

## Scope

This migration covers only fitness-tracker persistence.

In scope:
- Fitness activity logs currently stored under `fittrack_logs`.
- Fitness tracker backend endpoints, service methods, model constraints, and validation schema.
- Fitness-related consumers that read activity logs, such as the fitness tracker page, dashboard, progress charts, and insights.

Out of scope for this phase:
- Full app-wide localStorage migration.
- Profile, goals, water intake, reminders, meal plans, nutrition planner state, and auth persistence.
- Multi-user ownership and `userId` scoping.

The app should eventually support multiple users, but this phase treats activity data as single-user/global until auth and user modules are ready.

## Confirmed Decisions

1. Backend readiness fix:
   - Do not permanently remove currently broken app module mounts.
   - Temporarily comment out the broken import and `app.use(...)` sections in `2_backend_practice/src/app.js` so the fitness tracker API can start.
   - Keep those sections visible because they will be needed soon.

2. Activity read endpoint:
   - Add a proper activity list endpoint:

   ```txt
   GET /api/v1/fitness-tracker/activities
   ```

   - Return activities using the same shape as the current frontend log objects:

   ```js
   {
     activities: [
       {
         id,
         type,
         activity,
         duration,
         steps,
         calories,
         date,
         notes,
         loggedAt
       }
     ]
   }
   ```

3. Frontend service:
   - Add a shared frontend service at:

   ```txt
   1_FRONTEND/js/service/fitness-service.js
   ```

   - This file is responsible for:
     - Fetching activity logs from the backend.
     - Falling back to localStorage for this phase.
     - Running one-time migration from localStorage to backend.
     - Providing thin domain helpers for activity-log access.
     - Giving other pages one shared source instead of each page reading `fittrack_logs` directly.

4. Writes become API-first:
   - `logWorkout()` and `logSteps()` should POST to the backend first.
   - If the backend call fails, show an error and save nothing.
   - Only update in-memory state and UI after the backend succeeds.

5. One-time local data migration:
   - Existing `fittrack_logs` data should be migrated to MongoDB.
   - Compare records by frontend-generated `id`.
   - Use a marker such as `fittrack_logs_migrated_v1` so migration does not repeat unnecessarily.
   - Keep old localStorage data temporarily as a safety backup during this phase.

6. Delete behavior:
   - Keep the existing backend-first delete behavior.
   - After backend delete succeeds, remove the row from the DOM and remove the activity from the service cache.
   - Avoid deleting only from localStorage after the migration.

7. Duplicate step logs:
   - Preserve the current product behavior: only one `steps` activity per date.
   - Keep the frontend duplicate check.
   - Add backend protection so duplicate step entries cannot be created by refreshes, another page, or direct API calls.

8. Offline behavior:
   - No offline queue in this phase.
   - If the backend is unavailable during create/delete, show an error and save nothing.

## Backend Plan

Update `fitnessTrackerController.js`:
- Add `GET /activities`.
- Continue supporting existing `GET /` overview.
- Keep existing `POST /activities`.
- Keep existing `DELETE /activities/:id`.

Update `fitnessTrackerService.js`:
- Add `getActivities()`.
- Add duplicate step protection inside `createActivity(activity)` before insert:
  - If `activity.type === 'steps'`, check whether a `steps` record already exists for `activity.date`.
  - If yes, throw a conflict error or return a structured duplicate result.

Update `fitnessTrackerSchema.js`:
- Add validation schema for the new `GET /activities` route if the local route pattern expects it.
- Keep request body shape compatible with current frontend objects.

Update `fitnessTrackerModel.js`:
- Keep `id` as a required unique string because frontend rows and delete behavior use it.
- Consider adding an index for duplicate steps:

```js
fitnessTrackerSchema.index(
  { type: 1, date: 1 },
  { unique: true, partialFilterExpression: { type: 'steps' } }
)
```

If using this index, the service should still catch duplicate-key errors and return a clean `409 Conflict` response.

Update `app.js`:
- Temporarily comment out broken imports and route mounts that point to modules that do not currently exist.
- Keep the comments readable so those modules can be restored later.

## Frontend Plan

Create `1_FRONTEND/js/service/fitness-service.js`.

Because the current HTML pages use plain script tags instead of ES modules, the safest phase-one implementation is a global service:

```js
window.FitnessService = {
  loadActivities,
  getActivities,
  createActivity,
  deleteActivity,
  migrateLocalLogsToBackend,
  findDuplicateStepsForDate
};
```

This avoids converting multiple pages to `type="module"` in the same migration.

Update script order:
- Load `../js/service/fitness-service.js` before page scripts that need fitness logs.
- Pages likely affected:
  - `fitness-tracker.html`
  - `dashboard.html`
  - `progress-charts.html`
  - `notification.html` if it still needs insights based on fitness logs.

Update `fitness.js`:
- Remove direct `fittrack_logs` localStorage read/write as the source of truth.
- On page load:
  - call `FitnessService.loadActivities({ migrate: true })`
  - render returned activities
  - update summaries
- In `logWorkout()` and `logSteps()`:
  - build payload
  - call `FitnessService.createActivity(payload)`
  - append row only after success
- In delete confirmation:
  - call `FitnessService.deleteActivity(id)`
  - remove row only after success

Update `dashboard.js`, `progress-charts-wiring.js`, and `insights.js`:
- Replace direct `localStorage.getItem('fittrack_logs')` usage with `FitnessService`.
- These pages should wait for `FitnessService.loadActivities()` before computing derived UI.

## Fallback Strategy

For this phase, the service may fall back to localStorage for reads only when:
- Backend activity loading fails.
- The page needs to remain readable during backend development.

Writes should not fall back to localStorage:
- Create failure: show an error and save nothing.
- Delete failure: show an error and keep the UI unchanged.

This keeps backend persistence as the source of truth while still allowing older local data to be displayed during transition.

## Migration Flow

On first load after the service is added:

1. Fetch backend activities.
2. Read local `fittrack_logs`.
3. If migration marker is missing:
   - Find local logs whose `id` is not present in backend activities.
   - POST each missing activity.
   - Ignore or cleanly handle duplicate conflicts.
   - Refresh backend activities after migration.
   - Set `fittrack_logs_migrated_v1`.
4. Render from the service cache.

Do not clear `fittrack_logs` immediately.

## Resolved Implementation Decisions

1. `app.js` currently imports several paths that do not exist.
   - This can prevent the backend from starting.
   - Decision: comment those imports and route mounts temporarily.
   - Keep the commented sections visible so they can be restored when those modules are ready.

2. `notification.html` includes `fitness.js`.
   - `fitness.js` assumes fitness-tracker DOM elements exist.
   - This is fragile today and may throw errors on non-fitness pages.
   - Decision: move shared log and insight functionality to `fitness-service.js` first.
   - Keep page-specific DOM work in `fitness.js`.

3. Existing pages are not using ES modules.
   - Decision: expose the service as `window.FitnessService`.
   - This is the low-risk approach for the current plain-script setup.
   - A later cleanup can convert frontend scripts to modules if desired.

4. Date handling should stay consistent.
   - Decision: keep current date conventions.
   - Current logs use `YYYY-MM-DD` strings.
   - Keep this format for `date`.
   - Keep `loggedAt` as ISO strings from the frontend or backend-generated dates.

5. Backend duplicate step protection needs clear error mapping.
   - Decision: preserve the product rule of one `steps` log per date.
   - The frontend should show the existing duplicate message for duplicate same-day steps.
   - Backend should return a predictable `409 Conflict` rather than a raw MongoDB duplicate-key error.

6. API response shape should be stable.
   - Decision: use explicit and stable response shapes for this phase.
   - `POST /activities` should ideally return the created activity object.
   - `DELETE /activities/:id` can keep returning `{ message, data }`.
   - `GET /activities` should return `{ activities }`.

7. Summary calculations still depend on profile and goals.
   - Decision: leave profile and goals in localStorage for this phase.
   - `fittrack_profile` and `fittrack_goals` remain in localStorage this phase.
   - This is acceptable because the migration scope is fitness activity persistence only.

No additional blockers are known after these decisions. The implementation can proceed in the phased order below or in the dedicated implementation plan.

## Suggested Implementation Order

1. Temporarily comment broken backend imports/routes in `app.js`.
2. Add backend `GET /activities`.
3. Add backend duplicate step protection.
4. Create `1_FRONTEND/js/service/fitness-service.js`.
5. Wire `fitness-tracker.html` to load the service before `fitness.js`.
6. Refactor `fitness.js` to use the service.
7. Wire `dashboard.js`, `progress-charts-wiring.js`, and `insights.js` to use the service.
8. Manually test:
   - first-load migration from existing local logs
   - list rendering
   - workout create
   - steps create
   - duplicate steps rejection
   - delete
   - dashboard/progress/insights still showing the same user-facing numbers
