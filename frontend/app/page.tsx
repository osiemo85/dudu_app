"use client";
import { useLanguage, T } from "@/components/LanguageProvider";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { Icon, type IconName } from "@/components/Icon";
const tools: {
  href: string;
  icon: IconName;
  title: string;
  text: string;
  tone: string;
}[] = [
  {
    href: "/health",
    icon: "scan",
    title: "Health checks",
    text: "Crops and animals. Find the right next step.",
    tone: "gold",
  },
  {
    href: "/planting",
    icon: "plant",
    title: "Plan your planting",
    text: "Find crop options for your area and season.",
    tone: "green",
  },
  {
    href: "/chat",
    icon: "chat",
    title: "Ask your farm assistant",
    text: "Talk through a question, one step at a time.",
    tone: "blue",
  },
  {
    href: "/farms",
    icon: "farm",
    title: "Keep your farm notes",
    text: "Your observations, organised in one place.",
    tone: "rust",
  },
];
export default function Home() {
  const {t}=useLanguage();
  return (
    <DashboardShell>
      <div className="page-intro">
        <div>
          <p className="eyebrow"><T>ROOTED IN CARE</T></p>
          <h1><T>Let’s grow something good.</T></h1>
          <p><T>Your everyday companion, from planting to harvest.</T></p>
        </div>
        <span className="intro-leaf">
          <Icon name="leaf" size={32} />
        </span>
      </div>
      <div className="home-grid">
        <section className="harvest-hero">
          <div className="hero-copy">
            <span className="hero-label">
              <span /><T>A HEALTHIER FARM STARTS HERE</T></span>
            <h2><T>Small steps.</T><br /><T>Stronger crops.</T><br />
              <em><T>Better harvests.</T></em>
            </h2>
            <p><T>Understand what your crops need and make your next move with confidence.</T></p>
            <Link href="/disease" className="button button-gold">
              <Icon name="scan" /><T>Check my crop</T><Icon name="arrow" size={18} />
            </Link>
            <Link href="/planting" className="hero-secondary"><T>Explore planting advice</T><span aria-hidden="true">↗</span>
            </Link>
          </div>
          <svg
            className="farm-art"
            viewBox="0 0 520 380"
            fill="none"
            role="img"
            aria-label="Illustrated green fields, sunshine, and growing crops"
          >
            <circle cx="375" cy="90" r="50" fill="#E9B65D" />
            <path
              d="M0 215C130 95 230 170 340 145S500 150 550 200V380H0Z"
              fill="#396B40"
            />
            <path
              d="M-20 300C150 170 330 230 530 160V380H-20Z"
              fill="#8BB665"
            />
            <path d="M-40 380C170 210 310 270 550 220V380Z" fill="#D0DCA0" />
            <path
              d="M0 380C160 255 340 320 530 255M90 400C250 280 400 340 550 295M250 400C330 350 470 365 550 335"
              stroke="#486D39"
              strokeWidth="12"
            />
            <path
              d="M265 205v-87m0 48c-42-2-50-26-48-40 32-1 48 18 48 40Zm0-23c36-1 46-24 45-37-28 0-44 15-45 37Z"
              stroke="#B7DC74"
              strokeWidth="5"
              fill="#B7DC74"
            />
            <path
              d="M150 255v-55m0 25c-23-1-35-17-32-28 22 0 32 13 32 28Zm0-10c23-1 35-18 32-29-22 0-32 14-32 29Z"
              stroke="#17462F"
              strokeWidth="4"
              fill="#17462F"
            />
            <path
              d="M370 218v-37m-13 16 13 13 15-19"
              stroke="#17462F"
              strokeWidth="5"
            />
            <path d="m404 193 35-26 34 26v41h-69Z" fill="#F6F4EC" />
            <path d="m393 193 46-35 46 35" stroke="#17462F" strokeWidth="8" />
            <path d="M432 211h15v23h-15Z" fill="#17462F" />
            <path
              d="M31 110c28-20 49-9 60 4m-30-17c23-19 44-11 53 0"
              stroke="#71947B"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </section>
        <section className="tools-section">
          <div className="section-heading">
            <h2><T>What would you like to do?</T></h2>
            <span><T>Made for your farm</T></span>
          </div>
          <div className="tool-grid">
            {tools.map((tool) => (
              <Link className="tool-card" href={tool.href} key={tool.href}>
                <span className={`tool-icon ${tool.tone}`}>
                  <Icon name={tool.icon} size={25} />
                </span>
                <h3>{t(tool.title)}</h3>
                <p>{t(tool.text)}</p>
                <span className="tool-arrow">
                  <Icon name="arrow" size={18} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="home-bottom">
        <section className="panel journey-panel">
          <p className="eyebrow"><T>A LITTLE GUIDANCE GOES A LONG WAY</T></p>
          <h2><T>With you through the growing season.</T></h2>
          <div className="growing-journey">
            {(
              [
                ["pin", "Choose your area"],
                ["plant", "Make a plan"],
                ["scan", "Care for crops"],
                ["farm", "Keep learning"],
              ] as [IconName, string][]
            ).map(([icon, label], i) => (
              <div key={t(label)}>
                <span>
                  <Icon name={icon} />
                </span>
                <small>0{i + 1}</small>
                <strong>{t(label)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel evidence-note">
          <span className="tool-icon green">
            <Icon name="book" />
          </span>
          <h2><T>Good decisions start with good context.</T></h2>
          <p><T>Choose your area and season before exploring advice. Every result shows the evidence used and what still needs checking.</T></p>
          <Link href="/help"><T>How this demo works</T><Icon name="arrow" size={16} />
          </Link>
        </section>
      </div>
    </DashboardShell>
  );
}
