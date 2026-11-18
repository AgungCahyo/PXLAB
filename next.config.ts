import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const indonesianRoutes = [
  "/explore",
  "/creators",
  "/space",
  "/create",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/responses",
  "/settings",
  "/welcome",
  "/admin",
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/id" },
        ...indonesianRoutes.map((route) => ({
          source: route,
          destination: `/id${route}`,
        })),
        { source: "/creation/:id", destination: "/id/creation/:id" },
        { source: "/create/:id", destination: "/id/create/:id" },
        { source: "/u/:username", destination: "/id/u/:username" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: "/id", destination: "/", permanent: true },
      { source: "/id/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
