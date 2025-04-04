import {resolve} from "node:path"
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue"; //add this line

export default defineConfig({
  plugins: [vue()],
  rollupOptions: {
    input: {
      main: resolve(__dirname, "./index.html")
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})