/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// In dev/preview, the frontend calls "/api/..." and Vite forwards it to the backend.
// This keeps the app same-origin, so it also works from a phone on the local network.
const apiProxy = {
  "/api": {
    target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ""),
  },
};

// Hosts of a Cloudflare quick tunnel, used to get HTTPS on a phone (see README).
const allowedHosts = [".trycloudflare.com"];

// Same security headers as production (render.yaml, nginx.conf.template), so that
// `npm run preview` shows any break they cause. Inline styles are allowed for React's
// computed sizes (chart bars, dots); scripts only from the site itself.
const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
    "font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Affluence Gym",
        short_name: "Affluence",
        description: "Affluence en temps réel des salles d'entraînement, signalée par les étudiants.",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f3f6f8",
        theme_color: "#13213c",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Self-hosted fonts are part of the app shell, so they work offline too.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Shows quiet-gym notifications (push) and opens the app on tap.
        importScripts: ["push-sw.js"],
        // Never serve live occupancy data from the cache.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: { host: true, proxy: apiProxy, allowedHosts },
  preview: { host: true, proxy: apiProxy, allowedHosts, headers: securityHeaders },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    restoreMocks: true,
  },
});
