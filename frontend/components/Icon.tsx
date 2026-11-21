import type { CSSProperties } from "react";
export type IconName =
  | "home"
  | "scan"
  | "plant"
  | "chat"
  | "farm"
  | "arrow"
  | "pin"
  | "check"
  | "sun"
  | "book"
  | "download"
  | "send"
  | "leaf"
  | "user"
  | "settings"
  | "logout"
  | "chevron"
  | "back";
const paths: Record<IconName, string> = {
  settings: "M4 7h16M4 17h16M9 4v6m6 4v6",
  logout: "M9 4H4v16h5m5-13 5 5-5 5m-6-5h15",
  chevron: "m9 5 7 7-7 7",
  back: "m14 6-6 6 6 6",

  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  scan: "M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m8 0h4a1 1 0 0 0 1-1v-4M7 12h10m-5-5v10",
  plant: "M12 21v-9M12 15C3 16 3 6 3 6s9-1 9 9Zm0-4C12 3 21 3 21 3s1 9-9 9",
  chat: "M21 11a9 9 0 0 1-9 9H4l-3 2 2-6a9 9 0 1 1 18-5ZM7 10h10M7 14h6",
  farm: "m3 11 9-8 9 8v10H3Zm5 10v-8h8v8M1 11h22",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  check: "m5 12 4 4L19 6",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  book: "M12 5c-3-2-7-2-10-1v16c3-1 7-1 10 1m0-16c3-2 7-2 10-1v16c-3-1-7-1-10 1Zm0 0v16",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  send: "m3 3 19 9-19 9 4-9Zm4 9h15",
  leaf: "M19 3C5 1 2 9 7 16s16 2 12-13ZM5 21l10-13",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 22v-3a9 9 0 0 1 18 0v3",
};
export function Icon({
  name,
  size = 22,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
