import type { Metadata, Viewport } from "next";
import "./globals.css";
import { publicAsset } from "@/lib/deployment";

export const metadata: Metadata = {
  title: "Архив стримов — фильмы и сериалы",
  description: "Фильмы и сериалы, которые я смотрел на стримах. Найдите запись и продолжите просмотр на Boosty.",
  icons: { icon: publicAsset("icon.svg") },
};

export const viewport: Viewport = { themeColor: "#0D0F14", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
