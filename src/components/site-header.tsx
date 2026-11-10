import { Clapperboard, Radio, Send } from "lucide-react";
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
      <nav className="header-links" aria-label="Стримы и анонсы">
        <a className="header-link" href={siteConfig.twitchUrl} target="_blank" rel="noopener noreferrer" aria-label="Смотреть вживую на Twitch (откроется в новой вкладке)">
          <Radio size={17} strokeWidth={1.7} aria-hidden="true" />
          <span>Смотреть вживую</span>
        </a>
        <a className="header-link" href={siteConfig.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Анонсы стримов в Telegram (откроется в новой вкладке)">
          <Send size={17} strokeWidth={1.7} aria-hidden="true" />
          <span>Анонсы стримов</span>
        </a>
      </nav>
    </header>
  );
}
