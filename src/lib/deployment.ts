/** Путь проекта на Pages: /stream-archive; для личного сайта и своего домена — пустой. */
export function normalizeBasePath(value: string): string {
  const path = value.trim().replace(/\/+$/, "");
  if (!path) return "";
  if (!/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/.test(path) ||
    path.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("INVALID_BASE_PATH");
  }
  return path;
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? "");

export function publicAsset(filename: string): string {
  return `${basePath}/${filename.replace(/^\/+/, "")}`;
}
