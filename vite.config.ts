import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  publicLinkCodeFunctionPathPrefix,
  publicLinkCodeFromQrPathname,
  publicLinkCodePathPrefix,
  publicLinkCodeQrFunctionPathPrefix
} from './common/linkCodePublicUrls'

const publicLinkCodeQrProxyPattern = `^${publicLinkCodePathPrefix}/[^/]+/qr\\.png$`
const publicLinkCodeProxyPattern = `^${publicLinkCodePathPrefix}(/|$)`

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [publicLinkCodeQrProxyPattern]: {
        changeOrigin: true,
        rewrite: (path) => {
          const code = publicLinkCodeFromQrPathname(path)

          return code
            ? `${publicLinkCodeQrFunctionPathPrefix}/${encodeURIComponent(code)}/qr.png`
            : path
        },
        target: 'http://127.0.0.1:54321',
        xfwd: true
      },
      [publicLinkCodeProxyPattern]: {
        changeOrigin: true,
        rewrite: (path) => path.replace(publicLinkCodePathPrefix, publicLinkCodeFunctionPathPrefix),
        target: 'http://127.0.0.1:54321',
        xfwd: true
      }
    }
  }
})
