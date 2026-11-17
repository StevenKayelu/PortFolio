import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

/**
 * Link previews (WhatsApp, Facebook, LinkedIn) and search engines read the
 * first HTML, before any script runs, so each site needs its own copy of
 * index.html with its own title, description and share image. Vercel serves
 * these per domain (see vercel.json).
 */
const SITE_PAGES = {
  "devgen.html": {
    title: "DevGen Ventures — Building ideas into meaningful ventures",
    description: "DevGen Ventures is an umbrella brand for technology services, products and future ventures, founded by Steven Kayelu in Kitwe, Zambia.",
    siteName: "DevGen Ventures", url: "https://devgenventures.com/", image: "https://devgenventures.com/og/devegen.png", type: "website",
  },
  "solutions.html": {
    title: "DevGen Solutions LTD — Business systems, web & mobile apps, IT support",
    description: "DevGen Solutions LTD builds business systems, web and mobile applications and provides IT support in Zambia. Request a quote.",
    siteName: "DevGen Solutions LTD", url: "https://devgenventures.com/solutions", image: "https://devgenventures.com/og/solutions.png", type: "website",
  },
};

const esc = (v) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function sitePages() {
  return {
    name: "site-pages",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir || "dist";
      const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
      const block = /<!-- site-meta:start[\s\S]*?<!-- site-meta:end -->/;
      if (!block.test(html)) throw new Error("index.html is missing the site-meta markers.");
      for (const [file, m] of Object.entries(SITE_PAGES)) {
        const tags = [
          `<title>${esc(m.title)}</title>`,
          `<meta name="description" content="${esc(m.description)}" />`,
          `<meta property="og:type" content="${m.type}" />`,
          `<meta property="og:site_name" content="${esc(m.siteName)}" />`,
          `<meta property="og:title" content="${esc(m.title)}" />`,
          `<meta property="og:description" content="${esc(m.description)}" />`,
          `<meta property="og:url" content="${m.url}" />`,
          `<meta property="og:image" content="${m.image}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
        ].join("\n    ");
        fs.writeFileSync(path.join(dir, file), html.replace(block, tags));
      }
      // No index.html: Vercel would serve it for "/" on every domain before
      // its domain rules apply. Steven's site gets steven.html instead.
      fs.renameSync(path.join(dir, "index.html"), path.join(dir, "steven.html"));
    },
  };
}

export default defineConfig({
  plugins: [react(), sitePages()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 5173 },
  build: {
    sourcemap: false,
    // Manual chunking keeps the vendor bundle from becoming one giant
    // blob so first paint stays fast (part of the Lighthouse > 95 target).
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          mui: ["@mui/material", "@mui/icons-material"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
