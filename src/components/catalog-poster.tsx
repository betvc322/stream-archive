"use client";

import Image from "next/image";
import { useState } from "react";

export function CatalogPoster({ url }: { url: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visible = url !== null && url !== failedUrl;
  return (
    <span className="record-poster" aria-hidden="true" title={visible ? undefined : "Постер пока не добавлен"}>
      {visible ? (
        <Image src={url} alt="" width={38} height={56} unoptimized loading="lazy"
          referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
      ) : <span className="poster-placeholder">Нет<br />постера</span>}
    </span>
  );
}
