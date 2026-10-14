import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import mdx from 'fumadocs-mdx/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 3003 },
  resolve: { tsconfigPaths: true },
  plugins: [mdx(), tailwindcss(), tanstackStart(), nitro(), react()],
})
