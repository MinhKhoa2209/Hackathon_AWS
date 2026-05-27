import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://localhost:8000",
      "/upload": "http://localhost:8000",
      "/query": "http://localhost:8000",
      "/docs": "http://localhost:8000",
      "/flashcards": "http://localhost:8000",
      "/quiz": "http://localhost:8000",
      "/queries": "http://localhost:8000"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
