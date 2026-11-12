# Student Academic Progress & Support Platform — Frontend

React + Vite + TypeScript frontend scaffold based on the supplied South Asian University screens and the project architecture/security plan.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite. The default `.env.example` enables the mock API so the UI can be explored before the Express backend is ready.

## Demo roles

Use the login page's role selector and any email/password values. Demo roles:
- Student — Alex Morgan
- Professor — Dr. Sarah Chen
- Admin — Platform Administrator

Mock data is intentionally illustrative. It is not real academic information.

## Connect the Express API

Set:

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:4000/api
```

The API client sends cookies with `withCredentials: true`. Configure the Express CORS allowlist to permit the Vite origin with credentials. In production, serve over HTTPS and use the backend's `httpOnly; Secure; SameSite=Strict` cookie policy. Do not put JWTs in localStorage.

The API methods follow the supplied contract:
- `GET /me`
- `GET /slots`, `POST /slots`, `DELETE /slots/:id`
- `POST /slots/:id/requests`
- `GET /requests?mine=true`
- `POST /requests/:id/cancel|confirm|reschedule`
- `GET /students/:id/progress?asOf=`
- `POST /assessments/:id/grades`
- `POST /grades/:id/correct`
- `GET /students/:id/history`
- `GET /admin/audit/verify`

If your backend uses the exact paths in the PDF with the `/api` prefix, no rewrite is needed. Confirm response DTO field names with the backend team before integration; adapt only `src/api/*` if the server's DTO shape differs.

## Important integration notes

- `VITE_USE_MOCK_API=true` uses a local mock adapter for demo only. Mock data is stored in browser localStorage under `sap_mock_state`; clear it to reset.
- The real API mode uses cookie authentication. Login/logout are server calls; `/me` is the source of truth.
- Each mutation intent gets an `Idempotency-Key`. The key is created once per user intent and reused for retries of that intent. Do not generate a new key in a generic Axios interceptor for every network retry.
- The UI never marks a request confirmed until the API returns success.
- Error handling branches on `error` machine codes, not human-readable `message`.
- Client-side role guards improve navigation UX only. Authorization and ownership checks must remain on the Express API.
- The platform's point-in-time progress view passes an ISO date via `asOf`.
- Grade corrections require a reason in the form and API payload.

## Project structure

```text
src/
  api/        Axios client, DTOs, API modules, mock adapter
  auth/       Auth context and route guards
  components/ Shared layout and UI
  pages/      Student, Professor and Admin pages
  utils/      Error mapping and formatting
```

## Build

```bash
npm run typecheck
npm run build
```

## If the page turns blank after login

The frontend now includes a render error boundary that shows the first render error instead of leaving a blank screen. The pinned Lucide icon import was also changed to a backward-compatible icon, and ID generation has a fallback for local-network HTTP development.

After replacing the project files, stop and restart Vite. If an older mock login state is still cached, open DevTools → Application → Local Storage and delete `sap_mock_state`, then reload and sign in again.

## Student dashboard personalisation

The student dashboard includes a fixed academic snapshot (semester, overall progress, enrolled courses and pending support requests) plus optional widgets that students can show or hide. Widget preferences are stored per authenticated student in browser localStorage for the frontend demo. When the Express backend is extended, preferences can move behind authenticated `GET/PUT /students/me/dashboard-preferences` endpoints without changing the widget components. Hiding a widget only changes its presentation; it does not alter academic records or permissions.

The interface uses the Midnight Teal palette: navy `#172B3A`, teal `#287C78`, ivory `#F6F5F0`, lavender `#E9E5F5`, and amber `#D5A66D`.
## Mock API troubleshooting

The mock adapter matches request paths separately from query strings. For example,
`GET /requests?mine=true` is routed to the mock requests collection. Demo data is
stored in browser `localStorage` under `sap_mock_state`; clearing that key resets
the demo to its seeded sample data. Do not clear it if you need to preserve requests
created during your current demo.
