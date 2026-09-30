# MyShule web application

The Next.js application and its same-origin API gateway run on Cloudflare Workers through OpenNext. Railway continues to run the API, database, Redis and background services. Cloudflare manages authoritative DNS; Vercel remains only the registrar for `myshule.online`.

## Local development

Use Node.js 22 and install dependencies with `npm ci` in this directory. Run `npm run dev` for the development server at `http://localhost:3000`.

Use `npm run build:cloudflare` followed by `npm run preview:cloudflare` to exercise the compiled Worker and static assets. `npm run test:cloudflare` verifies gateway and deployment contracts. Keep credentials in local ignored configuration or the production secret store, never in source control.

## Production deployment

Pushes and merges to `main` run the GitHub CI quality, security, build and integration gates before deploying the verified Cloudflare artifact. Deployment uses the main-only `production-cloudflare` environment and verifies both the Worker hostname and `https://www.myshule.online`. Railway's existing Git integration deploys its affected backend services independently.

`wrangler.jsonc` declares the production Worker, static assets, private gateway binding and apex/wildcard routes. Keep the Cloudflare proxied DNS records and apex-to-www redirect in place. Domain registration and automatic renewal remain in Vercel; do not restore Vercel application builds or transfer the domain.

For architecture, validation evidence and Cloudflare rollback guidance, see [the migration record](../../docs/deployment/cloudflare-migration.md). Production rollback uses a verified Cloudflare version and its assets, preserving Railway data and queues.
