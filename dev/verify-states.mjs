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
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1200'],
  defaultViewport: { width: 1920, height: 1200 },
})
const page = await browser.newPage()
await page.setRequestInterception(true)
let mode = 'real'
page.on('request', (request) => {
  const isSummary = request.url().includes('/saldo-deepseek-harness/summary')
  if (!isSummary) { request.continue(); return }
  const base = {
    ok: false, code: 'signed-out', fetchedAt: Date.now() - 4000, serverNow: Date.now(), stale: false,
    error: null, balance: null,
    rate: { usdCny: 6.686583, source: 'open.er-api.com', fetchedAt: Date.now() - 5000, sourceUpdatedUnix: 1794268951, sourceUpdatedText: 'Tue, 10 Nov 2026 00:02:31 +0000', stale: false, error: null },
    config: { balanceRefreshMs: 300000, rateRefreshMs: 21600000 },
  }
  const payloads = {
    'signed-out': { ...base, error: null },
    'unauthorized': { ...base, code: 'unauthorized', error: 'a conta conectada foi recusada pela Plataforma (401)' },
    'rate-unavailable': {
      ...base,
      ok: false,
      code: 'rate-unavailable',
      balance: {
        wallets: { recharge: [{ currency: 'USD', balance: '2.0' }], bonus: [] },
        cny: { recharge: 0, bonus: 0, total: 0 },
        usd: { recharge: 2, bonus: 0, total: 2 },
        converted: null,
      },
      rate: null,
      error: 'cotação indisponível',
    },
    'stale': {
      ...base,
      ok: true, code: null, stale: true, error: 'timeout ao consultar a Plataforma',
      balance: {
        wallets: { recharge: [{ currency: 'USD', balance: '2.0' }], bonus: [{ currency: 'CNY', balance: '0.86' }] },
        cny: { recharge: 0, bonus: 0.86, total: 0.86 },
        usd: { recharge: 2, bonus: 0, total: 2 },
        converted: { rechargeCny: 13.37, bonusCny: 0.86, totalCny: 14.23, rate: 6.686583 },
      },
    },
    'network': 'abort',
  }
  const payload = payloads[mode]
  if (payload === 'abort') { request.abort(); return }
  request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
})

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
await clickByText('SALDO DEEPSEEK HARNESS')
await new Promise((r) => setTimeout(r, 2000))

for (const scenario of ['signed-out', 'unauthorized', 'rate-unavailable', 'stale', 'network']) {
  mode = scenario
  await clickByText('Atualizar')
  await new Promise((r) => setTimeout(r, 1500))
  const text = await page.evaluate(() => (document.querySelector('[role="dialog"]') || document.body).innerText)
  console.log('=== ' + scenario + ' ===')
  console.log(text.split('\n').filter((line) => line.trim().length > 0).slice(-14).join('\n'))
  await page.screenshot({ path: 'dev/shots/state-' + scenario + '.png' })
}
await browser.close()
