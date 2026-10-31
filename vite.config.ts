import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** `vite build --mode pages`: انتشار روی GitHub Pages زیر مسیر `/Sanjaq/` (مسیریاب مرورگر با basename)
 * `vite build --mode static`: ساخت ایستا برای Artifact؛ همهٔ فایل‌ها (تصویر و فونت) داخل بسته، مسیریاب در حافظه */
export default defineConfig(({ mode }) => {
  const isStatic = mode === 'static'
  const isPages = mode === 'pages'
  return {
    base: isStatic ? './' : isPages ? '/Sanjaq/' : '/',
    build: isStatic
      ? { assetsInlineLimit: 4_000_000, cssCodeSplit: false, outDir: 'dist-static', rolldownOptions: { output: { inlineDynamicImports: true } } }
      : {},
    plugins: [
      react(),
      tailwindcss(),
      {
        /* در ساخت ایستا فونت داخل CSS می‌نشیند؛ preload جداگانه آن را از inline شدن بازمی‌دارد */
        name: 'strip-font-preload-when-static',
        transformIndexHtml: { order: 'pre', handler: (html: string) => (isStatic ? html.replace(/\s*<link rel="preload"[^>]*>/g, '') : html) },
      },
    ],
    server: { port: 5173, host: '127.0.0.1' },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
