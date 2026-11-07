import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const emptyAnnouncements = JSON.stringify({ batchId: null, items: [] })

function announcementsDevApi(): Plugin {
  return {
    name: 'announcements-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0]
        if (path !== '/api/announcements') {
          next()
          return
        }
        try {
          const upstream = await fetch('http://127.0.0.1:8787/api/announcements')
          if (!upstream.ok) throw new Error(String(upstream.status))
          response.statusCode = 200
          response.setHeader('content-type', 'application/json; charset=utf-8')
          response.setHeader('cache-control', 'no-store')
          response.end(await upstream.text())
        } catch {
          response.statusCode = 200
          response.setHeader('content-type', 'application/json; charset=utf-8')
          response.setHeader('cache-control', 'no-store')
          response.end(emptyAnnouncements)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue(), announcementsDevApi(), ...(mode === 'development' ? [vueDevTools()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@data': fileURLToPath(new URL('./data', import.meta.url)),
    },
  },
}))
