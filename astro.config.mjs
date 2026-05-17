// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

const site = process.env.SITE_URL ?? "https://example.com";

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [icon()],

  vite: {
    plugins: [tailwindcss()],
  },
});
