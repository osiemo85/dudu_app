import Link from "next/link";
import { Icon } from "./Icon";
export function SiteHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand">
        <Icon name="plant" />
        duducare
      </Link>
      <Link href="/planting" className="button">
        Planting
      </Link>
      <Link href="/disease" className="button">
        Crop health
      </Link>
    </header>
  );
}
