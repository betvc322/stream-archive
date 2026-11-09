"use client";

import { CatalogError } from "@/components/catalog-states";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="site-shell"><CatalogError onRetry={reset} busy={false} /></main>;
}
