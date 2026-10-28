import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// NEXT_PUBLIC_* is what the Vercel ↔ Supabase integration injects, so the
// build picks up the project URL and publishable key without extra setup.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: { port: 5173 },
})
