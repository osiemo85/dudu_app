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

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Duducare provides Home, Planting, Crop health, Farm chat, and My farm navigation.
Mobile uses five fixed tabs; laptops use a sidebar. See the root README for
sample inputs, saved plan flows and PWA production/offline testing. The visual
reference is the repository-root `index.html`; app colors and spacing are in
`app/duducare.css`. Chat is scripted, and device notes are not cloud synced.

Duducare layout/theme CSS is imported separately in `app/layout.tsx`;
`app/globals.css` contains only Tailwind imports and token mappings. This keeps
custom layout styles independent of the Tailwind development compiler cache.
