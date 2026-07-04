import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  publicLinkCodeFunctionPathPrefix,
  publicLinkCodePathPrefix
} from './common/linkCodePublicUrls'

const publicLinkCodeProxyPattern = `^${publicLinkCodePathPrefix}(/|$)`

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [publicLinkCodeProxyPattern]: {
        changeOrigin: true,
        rewrite: (path) => path.replace(publicLinkCodePathPrefix, publicLinkCodeFunctionPathPrefix),
        target: 'http://127.0.0.1:54321'
      }
    }
  }
})
