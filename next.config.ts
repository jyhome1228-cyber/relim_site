import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/relim_site" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/relim_site/" : "",
  trailingSlash: true,
};

export default nextConfig;
