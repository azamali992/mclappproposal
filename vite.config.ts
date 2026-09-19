import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves a project site from /<repo>/, so the built asset paths
// need that prefix. Local dev and any root-domain host stay on '/'.
const base = process.env.GITHUB_PAGES === 'true' ? '/mclappproposal/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173, host: true },
});
