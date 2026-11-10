import { createRequire } from 'node:module'
// puppeteer-core não é dependência do plugin: aponte PUPPETEER_CORE_DIR para
// um node_modules que o tenha (ex.: o perfil web do DSH) ou instale-o à parte.
const candidates = [process.env.PUPPETEER_CORE_DIR, '/home/welliton/.dsh/profiles/web/node_modules'].filter(Boolean)
let puppeteer = null
for (const dir of candidates) {
  try { puppeteer = createRequire(dir.replace(/\/?$/, '/'))('puppeteer-core'); break } catch { /* tenta o próximo */ }
}
if (puppeteer === null) throw new Error('puppeteer-core não encontrado; defina PUPPETEER_CORE_DIR')

const url = process.env.DSH_TEST_URL
const out = process.env.OUT ?? 'dev/shots/settings-section.png'
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1200'],
  defaultViewport: { width: 1920, height: 1200 },
})
const page = await browser.newPage()
const errors = []
const requests = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('request', (r) => { if (r.url().includes('saldo-deepseek-harness/summary')) requests.push(r.url()) })
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1200))
await page.evaluate(() => { for (const el of document.querySelectorAll('button')) if ((el.textContent || '').trim() === 'Continuar') el.click() })
await new Promise((r) => setTimeout(r, 600))
const clickByText = async (text, exact = false) => page.evaluate((text, exact) => {
  const els = [...document.querySelectorAll('button, [role="menuitem"], [role="button"]')]
  const target = els.find((el) => { const t = (el.textContent || '').trim(); return exact ? t === text : t.includes(text) })
  if (!target) return false
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return true
}, text, exact)
await clickByText('Conectado em DeepSeek')
await new Promise((r) => setTimeout(r, 700))
await clickByText('Configurações', true)
await new Promise((r) => setTimeout(r, 900))
console.log('our section:', await clickByText('SALDO DEEPSEEK HARNESS'))
await new Promise((r) => setTimeout(r, 2500))
const beforeText = await page.evaluate(() => (document.querySelector('[role="dialog"]') || document.body).innerText)
await page.screenshot({ path: out })
// click refresh
const clickedRefresh = await clickByText('Atualizar')
console.log('refresh clicked:', clickedRefresh)
await new Promise((r) => setTimeout(r, 2000))
const afterText = await page.evaluate(() => (document.querySelector('[role="dialog"]') || document.body).innerText)
await page.screenshot({ path: out.replace('.png', '-refreshed.png') })
console.log('--- summary requests ---')
console.log(requests.join('\n'))
console.log('--- rendered text ---')
console.log(beforeText.slice(0, 2600))
console.log('--- text changed after refresh:', beforeText !== afterText)
console.log('--- console errors ---')
console.log(errors.slice(0, 8).join('\n') || '(none)')
await browser.close()
