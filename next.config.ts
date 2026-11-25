import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const indonesianRoutes = [
  "/home",
  "/explore",
  "/creators",
  "/space",
  "/create",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/dashboard",
  "/responses",
  "/activity",
  "/insights",
  "/saved",
  "/liked",
  "/archive",
  "/settings",
  "/profile/edit",
  "/welcome",
  "/admin",
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Stale-content policy: dynamic routes (every private/viewer-specific
    // page here) are never reused from the client cache across navigations.
    // Next 15 changed this default from 30s to 0s; pinning it prevents a
    // future default change from silently serving account data to another
    // account. Static, non-personalized segments keep the 5-minute default.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
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
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
