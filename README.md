# Student Academic Progress & Support Platform — Frontend

Frontend built with **HTML5, CSS3, JavaScript (ES6+), React, and Vite**. The application uses JSX for React components. It contains Student, Professor, and Admin portals, a mock API for independent frontend demonstrations, and an API client ready for the Express backend.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite. The mock API is enabled by default so the frontend can be explored before the backend is ready.

## Demo roles

Use the login page role selector and any email/password values. Demo roles:
- Student — Alex Morgan
- Professor — Dr. Sarah Chen
- Admin — Platform Administrator

Mock data is illustrative, not real academic information.

## Connect the Express API

Set the following in `.env` when the backend is available:

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:4000/api
```

The API client sends cookies with `withCredentials: true`. Configure Express CORS to allow the Vite origin with credentials. In production, serve over HTTPS and use the backend's secure, httpOnly cookie policy. Do not store JWTs in localStorage.

## Frontend architecture

- `src/pages/` — Student, Professor, Admin, and Login pages
- `src/components/` — shared layout, UI components, and error boundary
- `src/auth/` — authentication context and role guards
- `src/api/` — Axios client, API modules, mock adapter, error handling
- `src/utils/` — academic metric calculations
- `src/styles.css` — custom CSS3 styling and responsive layouts

React Router handles navigation. TanStack Query manages server state. Axios handles HTTP communication. These are supporting libraries; the core frontend stack remains HTML5, CSS3, JavaScript, React, and Vite.

## Build

```bash
npm run build
```

The output is generated in `dist/`.

## Mock data

Mock data is stored in browser localStorage under `sap_mock_state`. Clear that key to reset the demo. Dashboard widget preferences are stored per student in localStorage.

The UI does not mark a support request confirmed until the API returns success. Role guards improve navigation UX only; authorization and ownership checks must remain on the backend. The academic progress page supports point-in-time views using the `asOf` query parameter.

The interface uses the Midnight Teal palette: navy `#172B3A`, teal `#287C78`, ivory `#F6F5F0`, lavender `#E9E5F5`, and amber `#D5A66D`.
