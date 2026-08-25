import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Varsayılan olarak sadece IPv6 loopback'te (::1) dinliyordu. 0.0.0.0'a
    // bağlanarak hem 127.0.0.1'i hem de LAN IP'sini dinler - telefondan
    // aynı ağ üzerinden erişip kamerayı test edebilmek için gerekli.
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
