import { ArrowUpRight, Minus } from "lucide-react";
import { getBoostyUrl, seasonLabel, type CatalogItem } from "@/lib/catalog";
import { CatalogPoster } from "./catalog-poster";

export function CatalogRow({ item }: { item: CatalogItem }) {
  // Проверка перед рендером защищает также при изменении локального источника.
  const url = getBoostyUrl(item.url);
  const content = (
    <>
      <CatalogPoster url={item.posterUrl} />
      <span className="record-details">
        <span className="record-title">{item.title}<span className="sr-only">, {item.type === "movie" ? "фильм" : "сериал"}</span></span>
        <span className="record-meta">
          {item.year !== null && <span>{item.year}<span className="sr-only"> год</span></span>}
          {item.year !== null && item.season !== null && <span className="meta-dot" aria-hidden="true">·</span>}
          {item.season !== null && <span className="season-label">{seasonLabel(item.season)}</span>}
          {item.year === null && item.season === null && <span aria-label="Год не указан">—</span>}
        </span>
      </span>
      <span className="record-action" aria-hidden="true">
        {url ? <ArrowUpRight size={18} strokeWidth={1.6} /> : <Minus size={15} />}
      </span>
      <span className="sr-only">{url ? ", открыть запись на Boosty в новой вкладке" : ", запись пока недоступна"}</span>
    </>
  );

  return (
    <li className="record-item">
      {url ? (
        <a className="record-row record-row-link" href={url} target="_blank" rel="noopener noreferrer">{content}</a>
      ) : (
        <div className="record-row record-row-unavailable" title="Ссылка на запись пока не добавлена">{content}</div>
      )}
    </li>
  );
}
