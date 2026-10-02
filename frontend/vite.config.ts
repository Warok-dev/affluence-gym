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
        background_color: "#111827",
        theme_color: "#111827",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Never serve live occupancy data from the cache.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: { host: true, proxy: apiProxy, allowedHosts },
  preview: { host: true, proxy: apiProxy, allowedHosts },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    restoreMocks: true,
  },
});
