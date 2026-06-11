import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function vitePluginAnalytics(): Plugin {
  return {
    name: "conditional-analytics",
    transformIndexHtml(html) {
      const endpoint = process.env.VITE_ANALYTICS_ENDPOINT;
      const websiteId = process.env.VITE_ANALYTICS_WEBSITE_ID;
      if (!endpoint || !websiteId) {
        return html;
      }

      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              defer: true,
              src: `${endpoint}/umami`,
              "data-website-id": websiteId,
            },
            injectTo: "body",
          },
        ],
      };
    },
  };
}

export default defineConfig({
  define: {
    "import.meta.env.VITE_SENTRY_DSN": JSON.stringify(
      process.env.VITE_SENTRY_DSN ?? process.env.SENTRY_DSN ?? ""
    ),
  },
  plugins: [react(), tailwindcss(), jsxLocPlugin(), vitePluginAnalytics()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
