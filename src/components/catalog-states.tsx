import { ArrowRight, RefreshCw, SearchX, WifiOff, Film } from "lucide-react";

export function CatalogLoading() {
  return (
    <div role="status" aria-label="Загружаем каталог" className="catalog-loading">
      {Array.from({ length: 7 }, (_, index) => (
        <div className="skeleton-row" key={index} aria-hidden="true">
          <span className="skeleton skeleton-icon" />
          <span className="skeleton skeleton-title" style={{ width: `${[42, 33, 56, 24, 37, 49, 29][index]}%` }} />
          <span className="skeleton skeleton-meta" />
        </div>
      ))}
    </div>
  );
}

export function CatalogError({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div className="catalog-state" role="alert">
      <span className="state-icon"><WifiOff size={24} strokeWidth={1.5} /></span>
      <h2>Не удалось загрузить каталог</h2>
      <p>Проверьте подключение к интернету и попробуйте ещё раз.</p>
      <button className="state-button" onClick={onRetry} disabled={busy}>
        <RefreshCw size={15} className={busy ? "refreshing" : ""} aria-hidden="true" />
        {busy ? "Загружаем…" : "Повторить попытку"}
      </button>
    </div>
  );
}

export function CatalogEmpty({ isCatalogEmpty, onReset }: { isCatalogEmpty: boolean; onReset: () => void }) {
  return (
    <div className="catalog-state">
      <span className="state-icon">{isCatalogEmpty ? <Film size={25} strokeWidth={1.5} /> : <SearchX size={25} strokeWidth={1.5} />}</span>
      <h2>{isCatalogEmpty ? "Каталог пока пуст" : "Ничего не найдено"}</h2>
      <p>{isCatalogEmpty ? "Новые записи появятся здесь." : "Попробуйте другое название или выберите все записи."}</p>
      {!isCatalogEmpty && <button className="state-button" onClick={onReset}>Сбросить поиск и фильтры <ArrowRight size={15} aria-hidden="true" /></button>}
    </div>
  );
}
