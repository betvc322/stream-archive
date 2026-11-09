import { Clapperboard } from "lucide-react";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><Clapperboard size={25} strokeWidth={1.65} /></div>
        <div>
          <h1>{siteConfig.title}</h1>
          <p>{siteConfig.description}</p>
        </div>
      </div>
    </header>
  );
}
