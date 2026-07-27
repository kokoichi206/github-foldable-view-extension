import { defineConfig } from "vite";
import { crx, defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Foldable View for GitHub",
  description:
    "Code folding for the GitHub file view: fold by indent, collapse to a chosen depth",
  /* Chrome Web Store は同一バージョンの再アップロードを拒否するため、
     タグ・GitHub Release・manifest の版がずれてはならない。
     package.json を唯一の版の出所とし、ここでハードコードしないこと */
  version: pkg.version,
  /* crxjs はこのパスをプロジェクトルート基準で解決し、同じパスで dist へ emit する */
  icons: {
    16: "icons/icon-16.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },
  homepage_url: "https://github.com/kokoichi206/github-foldable-view-extension",
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
