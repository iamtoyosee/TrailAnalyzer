import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages (served from /TrailAnalyzer/)
// and when opened from any other path.
export default defineConfig({
  base: './',
  plugins: [react()],
})
