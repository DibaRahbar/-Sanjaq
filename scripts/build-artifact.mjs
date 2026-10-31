// ساخت یک فایل HTML تک‌صفحه‌ای برای انتشار به‌عنوان Artifact: `npm run build:artifact`
// خروجی: dist-artifact/index.html (بدون doctype و head؛ پوستهٔ Artifact آن‌ها را می‌گذارد)
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'

execSync('npx vite build --mode static', { stdio: 'inherit' })

const dir = 'dist-static'
const html = readFileSync(`${dir}/index.html`, 'utf8')
const cssHref = /<link[^>]*rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/.exec(html)?.[1]
const jsSrc = /<script[^>]*type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/.exec(html)?.[1]
if (!cssHref || !jsSrc) throw new Error('فایل CSS یا JS در خروجی پیدا نشد')

const css = readFileSync(`${dir}/${cssHref}`, 'utf8')
const js = readFileSync(`${dir}/${jsSrc}`, 'utf8').replaceAll('</script', '<\\/script').replaceAll('<!--', '<\\!--')

const FAVICON = 'data:image/svg+xml;base64,' + readFileSync('public/favicon.svg').toString('base64')

const out = `<meta charset="utf-8">
<title>سنجاق</title>
<link rel="icon" type="image/svg+xml" href="${FAVICON}">
<style>${css}</style>
<div id="root"></div>
<script>document.documentElement.lang = 'fa'; document.documentElement.dir = 'rtl'</script>
<script type="module">${js}</script>
`
mkdirSync('dist-artifact', { recursive: true })
writeFileSync('dist-artifact/index.html', out)
console.log('dist-artifact/index.html', (out.length / 1024 / 1024).toFixed(2), 'MB', readdirSync(`${dir}/assets`).length, 'assets inlined')
