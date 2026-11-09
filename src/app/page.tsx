import { Catalog } from "@/components/catalog";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-static";

export default function Home() {
  return (
    <div className="site-shell">
      <a href="#main" className="skip-link">Перейти к каталогу</a>
      <SiteHeader />
      <main id="main" tabIndex={-1}><Catalog /></main>
    </div>
  );
}
