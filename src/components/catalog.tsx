"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownWideNarrow, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { useCatalog } from "@/hooks/use-catalog";
import { entryWord, filterCatalog, indexCatalog, sortCatalog, type Category, type SortOrder } from "@/lib/catalog";
import { CatalogRow } from "./catalog-row";
import { CatalogEmpty, CatalogError, CatalogLoading } from "./catalog-states";

const filters: { value: Category; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "movie", label: "Фильмы" },
  { value: "series", label: "Сериалы" },
];

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "title-asc", label: "По алфавиту" },
  { value: "year-asc", label: "Сначала старые" },
  { value: "year-desc", label: "Сначала новые" },
];

export function Catalog() {
  const { data, error, isRefreshing, reload, loading } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortOrder>("title-asc");
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => indexCatalog(sortCatalog(data?.items ?? [], sort)), [data, sort]);
  const visible = useMemo(() => filterCatalog(index, deferredQuery, category), [index, deferredQuery, category]);
  const counts = useMemo(() => ({
    all: data?.items.length ?? 0,
    movie: data?.items.filter((item) => item.type === "movie").length ?? 0,
    series: data?.items.filter((item) => item.type === "series").length ?? 0,
  }), [data]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !(target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function reset() {
    setQuery("");
    setCategory("all");
    searchRef.current?.focus();
  }

  return (
    <section className="catalog" aria-label="Каталог записей">
      <div className="toolbar">
        <div className="search-field">
          <Search size={18} strokeWidth={1.7} aria-hidden="true" />
          <label htmlFor="catalog-search" className="sr-only">Поиск по названию</label>
          <input ref={searchRef} id="catalog-search" type="search" autoComplete="off" spellCheck={false}
            placeholder="Поиск по названию..." value={query} onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }}
            aria-controls="catalog-results" />
          {query ? (
            <button className="search-clear" aria-label="Очистить поиск" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>
              <X size={16} aria-hidden="true" />
            </button>
          ) : <kbd aria-hidden="true" title="Нажмите / для поиска">/</kbd>}
        </div>

        <div className="filters" role="group" aria-label="Тип записи">
          {filters.map((filter) => (
            <button key={filter.value} className={`filter-button ${category === filter.value ? "filter-active" : ""}`}
              aria-pressed={category === filter.value} onClick={() => setCategory(filter.value)}>
              {filter.label}<span className="filter-count">{data ? counts[filter.value] : "—"}</span>
            </button>
          ))}
        </div>

        <div className="sort-field">
          <ArrowDownWideNarrow size={16} strokeWidth={1.7} aria-hidden="true" />
          <label htmlFor="catalog-sort" className="sr-only">Сортировка по алфавиту или году выпуска</label>
          <select id="catalog-sort" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}>
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown size={13} aria-hidden="true" className="sort-chevron" />
        </div>
      </div>

      <div className="results-bar">
        <p role="status" aria-live="polite" aria-atomic="true">
          {data ? <>Найдено: <span className="result-number">{visible.length}</span> {entryWord(visible.length)}</> : loading ? "Загружаем каталог…" : "Каталог недоступен"}
        </p>
        {data && <span className={`source-label ${data.source === "demo" ? "source-demo" : ""}`}>
          <span className="source-dot" aria-hidden="true" />{data.source === "demo" ? "Демо-каталог" : "Все записи на Boosty"}
        </span>}
      </div>

      {data && error && <div className="refresh-error" role="alert">
        <span>Не удалось обновить каталог. Показаны последние загруженные записи.</span>
        <button onClick={() => void reload()} disabled={isRefreshing}>Повторить <RefreshCw size={13} aria-hidden="true" /></button>
      </div>}

      <div id="catalog-results" className="catalog-results" aria-busy={loading || deferredQuery !== query}>
        <div className="list-heading" aria-hidden="true"><span>Название</span><span className="heading-link">Запись</span></div>
        {loading ? <CatalogLoading /> : !data ? <CatalogError onRetry={() => void reload()} busy={isRefreshing} /> : visible.length === 0 ? (
          <CatalogEmpty isCatalogEmpty={data.items.length === 0} onReset={reset} />
        ) : (
          <ul className="record-list" aria-label="Записи стримов">{visible.map((item) => <CatalogRow key={item.id} item={item} />)}</ul>
        )}
      </div>

    </section>
  );
}
