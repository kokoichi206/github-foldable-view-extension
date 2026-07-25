import { defineConfig } from "vite";
import { crx, defineManifest } from "@crxjs/vite-plugin";

const manifest = defineManifest({
  manifest_version: 3,
  name: "GitHub Foldable View",
  description:
    "Code folding for the GitHub file view: fold by indent, collapse to a chosen depth",
  version: "0.1.0",
  content_scripts: [
    {
      matches: ["https://github.com/*"],
      js: ["src/content/main.ts"],
      run_at: "document_idle",
    },
  ],
});

export default defineConfig({
  plugins: [crx({ manifest })],
});
