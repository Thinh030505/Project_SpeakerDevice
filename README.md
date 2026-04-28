# BE_T10_2025

Backend project standardized to keep API code, client views, and manual test
scripts clearly separated.

## Main structure

- `app.js`: server entrypoint, starts `src/app.js`
- `src/app.js`: Express app setup
- `src/config`: database, security, upload, JWT, mail configuration
- `src/controllers`: request handlers grouped by `admin` and `client`
- `src/middleware`: auth, upload, error handling, validators
- `src/router/api`: API endpoints
- `src/router/web`: client page routes for Pug views
- `src/views/page/client`: client page templates
- `tests/manual`: one-off local test scripts and fixtures

## Conventions used

- Shared module exports are centralized through `index.js` files where useful
- API routes live under `/api/...`
- Client page routes live outside `/api` and render Pug templates
- Manual test scripts are kept out of the project root
- Route files use `*.route.js`, validator files use `*.validator.js`, and controller files keep the current `*.controllers.js` convention for compatibility
- Environment variables are documented in `.env.example`

## Testing

- Run smoke tests with `npm test`
- Smoke tests run with `SKIP_EXTERNAL_SERVICES=true` so they do not depend on live MongoDB or SMTP

## Notes

- Existing important files were kept in place to avoid breaking behavior
- Cleanup focused on duplicate structure, import consistency, and safer routing
