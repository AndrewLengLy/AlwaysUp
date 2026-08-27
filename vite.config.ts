import { defineConfig } from 'vitest/config'
import type { ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Yahoo's chart endpoint serves real prices for real companies with no key and no signup,
 * but sends no CORS headers, so the browser cannot call it directly. The dev server
 * proxies it under /yf.
 *
 * The forwarded User-Agent has to be replaced rather than passed through. Yahoo's edge
 * rejects a request whose User-Agent claims to be a browser when the TLS handshake in
 * front of it plainly is not one — which is exactly what a proxied request looks like,
 * and it comes back as 429 "Edge: Too Many Requests" rather than anything that reads like
 * a fingerprinting block. Known scraper agents (curl, python-requests) are refused the
 * same way. An honest name for this app is accepted, and is what a proxy ought to send.
 * Origin and Referer go too: forwarded unchanged they advertise a cross-site fetch from
 * localhost, which is not what this is.
 */
const UA = 'AlwaysUp/1.0 (parody portfolio viewer; local dev proxy)'

const yahooProxy: Record<string, ProxyOptions> = {
  '/yf': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/yf/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('user-agent', UA)
        proxyReq.removeHeader('origin')
        proxyReq.removeHeader('referer')
      })
    },
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // PORT lets a launcher assign a free port; 5173 stays the default.
  server: { port: Number(process.env.PORT) || 5173, proxy: yahooProxy },
  preview: { port: Number(process.env.PORT) || 5173, proxy: yahooProxy },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
