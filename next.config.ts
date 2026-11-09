import type { NextConfig } from "next";
import { basePath } from "./src/lib/deployment.ts";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
