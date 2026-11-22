This is the Next.js frontend for Duducare. It exposes independent disease
identification and planting-advice flows backed by the local FastAPI service.

## Getting Started

Start the FastAPI service first, then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Copy `.env.local.example` to `.env.local` and set `BACKEND_URL` to the FastAPI
origin (for example, `http://localhost:8000`). The value is server-only:
Next.js proxies browser requests from `/api/v1/*` to that origin, so no backend
host is embedded in browser code.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Deploy FastAPI separately and confirm that its public HTTPS origin serves
`/api/v1/health`. In the Vercel frontend project's **Settings → Environment
Variables**, set `BACKEND_URL` to that origin, without `/api/v1` (for example,
`https://dudu-app-nine.vercel.app`). Apply it to Production and any Preview
environments you use. Set the project's Root Directory to `frontend`.

Set the backend's `FRONTEND_URL` to the exact frontend origin, such as
`https://dudu-app-f.vercel.app`, for origin checks on registration and login.
Keep the existing `/api/v1/*` rewrite: it forwards requests and session cookies
through the frontend origin. Browser calls to the frontend domain are expected.
`BACKEND_URL` is server-only and must never contain a database URL or Supabase's
project API URL; it points to this project's FastAPI deployment.

Redeploy the frontend after changing `BACKEND_URL`, because the rewrite is
generated during the build. A local `.env.local` setting does not configure
Vercel's hosted environment. Hosted builds reject missing, localhost, and
common private-address targets with an explicit configuration error.

An API 404 with Vercel's `DNS_HOSTNAME_RESOLVED_PRIVATE` error means the rewrite
target resolves to a private address. A missing rewrite can also produce an
HTML 404, which is not FastAPI JSON. Check the deployment variable and rebuild;
changing JSON parsing alone cannot restore the backend connection.

After deployment, `/api/v1/health` on the frontend must return JSON, and
`/api/v1/auth/me` must return JSON with HTTP 401 when signed out. Register,
reload to confirm the session, log out, and log in again. Also check both
the disease and planting sample flows in the root README.

Run `npm run test:api` to check backend-target validation and account response
handling, including HTML/text proxy errors and FastAPI validation failures.


Duducare provides Home, Planting, Crop health, Farm chat, and My farm navigation.
Mobile uses five fixed tabs; laptops use a sidebar. See the root README for
sample inputs, saved plan flows and PWA production/offline testing. The visual
reference is the repository-root `index.html`; app colors and spacing are in
`app/duducare.css`. Chat is scripted, and device notes are not cloud synced.

Duducare layout/theme CSS is imported separately in `app/layout.tsx`;
`app/globals.css` contains only Tailwind imports and token mappings. This keeps
custom layout styles independent of the Tailwind development compiler cache.
