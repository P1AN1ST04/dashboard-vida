import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  css: { transformer: "postcss" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Vida — Personal Almanac",
        short_name: "Vida",
        description: "Tu almanaque personal: finanzas, habitos, metas, calendario y entrenamientos.",
        theme_color: "#c5734f",
        background_color: "#f3ead8",
        display: "standalone",
        orientation: "portrait",
        lang: "es",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "assets/brand/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "assets/brand/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        globIgnores: ["**/avatars/**", "**/hero/**", "**/marketing/**"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|webp|avif)$/,
            handler: "CacheFirst",
            options: { cacheName: "vida-images", expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: "es2022",
    cssMinify: false,
    sourcemap: true,
  },
});
