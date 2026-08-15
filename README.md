# Stock Manager — Deployment Package

This package was built from the latest supplied working files. It includes the cloud frontend, Express API, PostgreSQL schema and deployment templates.

## Before deployment
- Keep `.env` private; it is intentionally excluded.
- Keep `node_modules` excluded; run `npm install` on the host.
- Update `api-client.js` with the production API URL, or set `window.STOCK_MANAGER_API_URL` before it loads.
- Apply `database/schema.sql` to the production PostgreSQL database.
- Configure CORS with the exact frontend domain.

## Local test
```powershell
npm.cmd install
node server.js
```
Open the frontend with Live Server using the same host configured in `FRONTEND_ORIGIN`.

## Render backend
The included `render.yaml` uses:
- Build: `npm install`
- Start: `node server.js`

Add `DATABASE_URL`, `SESSION_SECRET` and `FRONTEND_ORIGIN` as private Render environment variables.

## Frontend
Host the static files on Netlify, Vercel or Cloudflare Pages. Set the API URL to the deployed backend URL, not localhost.
