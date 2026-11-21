"use client";
import { T } from "@/components/LanguageProvider";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
export default function HelpPage() {
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow">HERE TO HELP</p>
          <h1>Get to know Duducare.</h1>
          <p>
            A practical demo for crop care and planting, with evidence you can
            inspect.
          </p>
        </div>
      </div>
      <div className="help-grid">
        <section className="panel">
          <h2>Check a crop</h2>
          <p>
            Open Crop health, choose your crop, and add symptoms or a photo.
            Confirm your area and season. Possible matches are not a diagnosis.
            Expert review storage is optional.
          </p>
          <Link className="button button-secondary mt-4" href="/disease"><T>Check crop health</T></Link>
        </section>
        <section className="panel">
          <h2>Plan a season</h2>
          <p>
            Open Planting and select a listed county, area, and season. Local
            demo rules return options or a focused clarification. Dates and
            evidence limits appear with each result.
          </p>
          <Link className="button button-secondary mt-4" href="/planting">
            Explore planting
          </Link>
        </section>
        <section className="panel">
          <h2>Install on your device</h2>
          <p>
            On supported browsers, use the Install Duducare button when offered.
            On iPhone or iPad, open in Safari, then Share → Add to Home Screen.
            On a laptop, use your browser’s install option. Installation
            requires HTTPS or localhost and browser support.
          </p>
          <p className="mt-3">
            Offline, an explanation page is available. Advice, account access,
            and chat require a connection. Private API responses, photos, notes,
            and conversations are never cached by the service worker.
          </p>
        </section>
        <section className="panel">
          <h2>Understand the boundaries</h2>
          <p>
            Farm chat uses scripted local replies. It does not connect you to
            other farmers or a live advisor. Agricultural records are simulated
            examples. There is no connected live weather, pesticide registry, or
            supplier inventory.
          </p>
          <p className="mt-3">
            Consult a qualified extension officer for field decisions. Do not
            use an unverified match to choose a pesticide or dose.
          </p>
        </section>
      </div>
      <div className="panel mt-5">
        <h2>Your account & data</h2>
        <p className="page-description">
          You can explore crop health, planting, and chat without signing in.
          Accounts allow access to your saved crop health cases. My farm notes
          remain on this browser; export them for backup. Chat resets when you
          leave or reload the page.
        </p>
        <Link href="/account/login" className="button button-secondary mt-4">
          Account access
        </Link>
      </div>
    </DashboardShell>
  );
}
