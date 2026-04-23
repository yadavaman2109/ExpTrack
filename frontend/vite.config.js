import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/expenses': 'http://localhost:5000',
      '/analytics': 'http://localhost:5000',
      '/budget': 'http://localhost:5000',
      '/auth': 'http://localhost:5000',
      '/income': 'http://localhost:5000',
    }
  }
})