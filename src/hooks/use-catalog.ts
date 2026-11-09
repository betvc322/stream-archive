"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseCatalogItems, type CatalogPayload } from "@/lib/catalog";
import { publicAsset } from "@/lib/deployment";

// Браузер проверяет опубликованный снимок раз в минуту; Actions обновляет его по расписанию.
const REFRESH_INTERVAL = 60_000;

async function requestCatalog(signal: AbortSignal): Promise<CatalogPayload> {
  const response = await fetch(publicAsset("catalog.json"), { cache: "no-store", signal });
  if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("source" in value) ||
    (value.source !== "demo" && value.source !== "google")) throw new Error("INVALID_RESPONSE");
  return { items: parseCatalogItems(value), source: value.source };
}

export function useCatalog() {
  const [data, setData] = useState<CatalogPayload | null>(null);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const activeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const reload = useCallback(() => {
    if (activeRequest.current || !mounted.current) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    activeRequest.current = controller;
    // Состояние меняется в обработчиках сетевого ответа, а не при запуске эффекта.
    void requestCatalog(controller.signal).then((nextData) => {
      if (mounted.current && activeRequest.current === controller) {
        setData(nextData);
        setError(false);
      }
    }, () => {
      if (mounted.current && activeRequest.current === controller) setError(true);
    }).finally(() => {
      clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        if (mounted.current) setIsRefreshing(false);
      }
    });
  }, []);

  const retry = useCallback(() => {
    if (activeRequest.current || !mounted.current) return;
    setIsRefreshing(true);
    setError(false);
    void reload();
  }, [reload]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    const onVisible = () => { if (document.visibilityState === "visible") void reload(); };
    const interval = setInterval(onVisible, REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
      activeRequest.current = null;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  return { data, error, isRefreshing, reload: retry, loading: !data && !error };
}
