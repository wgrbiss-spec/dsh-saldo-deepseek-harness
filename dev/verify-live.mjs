import { createRequire } from 'node:module'
// QA local: aponte PUPPETEER_CORE_DIR para um node_modules com puppeteer-core.
const candidates = [process.env.PUPPETEER_CORE_DIR, '/home/welliton/.dsh/profiles/web/node_modules'].filter(Boolean)
let puppeteer = null
for (const dir of candidates) {
  try { puppeteer = createRequire(dir.replace(/\/?$/, '/'))('puppeteer-core'); break } catch { /* próximo */ }
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
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1500))

const clickByText = async (texts, exact = false) => page.evaluate((texts, exact) => {
  const els = [...document.querySelectorAll('button, [role="menuitem"], [role="button"]')]
  const target = els.find((el) => {
    const t = (el.textContent || '').trim()
    return texts.some((text) => exact ? t === text : t.includes(text))
  })
  if (!target) return false
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return true
}, texts, exact)

console.log('dismiss notice:', await clickByText(['Continuar', 'Continue']))
await new Promise((r) => setTimeout(r, 700))
await page.keyboard.down('Control'); await page.keyboard.press(','); await page.keyboard.up('Control')
await new Promise((r) => setTimeout(r, 900))
if (!(await page.evaluate(() => document.querySelector('[role="dialog"]') !== null))) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => { const r = el.getBoundingClientRect(); return r.y > innerHeight * 0.8 && (el.textContent || '').includes('DeepSeek') })
    b?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 700))
  console.log('settings item:', await clickByText(['Configurações', 'Settings'], true))
  await new Promise((r) => setTimeout(r, 900))
}
console.log('settings dialog open:', await page.evaluate(() => document.querySelector('[role="dialog"]') !== null))
console.log('our section:', await clickByText(['SALDO DEEPSEEK']))
await new Promise((r) => setTimeout(r, 2200))

const readState = () => page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]') || document.body
  const actionSlot = document.querySelector('[data-slot="settings.action"]')
  const langButtons = [...document.querySelectorAll('.sdh_lang_btn')].map((b) => ({ text: (b.textContent || '').trim(), disabled: b.disabled, on: b.classList.contains('sdh_lang_on') }))
  const configVisible = [...document.querySelectorAll('[data-slot="settings.action"] button')].some((b) => !b.classList.contains('sdh_lang_btn') && b.getBoundingClientRect().width > 0)
  return {
    text: dialog.innerText.split('\n').filter((l) => l.trim()).slice(0, 22),
    langButtons,
    configVisible,
    actionSlotFound: actionSlot !== null,
  }
})

const pt = await readState()
console.log('=== PT ===')
console.log(JSON.stringify(pt, null, 1))
await page.screenshot({ path: process.env.OUT ?? 'dev/shots/live-desktop-pt.png' })

console.log('click INGLÊS:', await clickByText(['INGLÊS'], true))
await new Promise((r) => setTimeout(r, 1200))
const en = await readState()
console.log('=== EN ===')
console.log(JSON.stringify(en, null, 1))
await page.screenshot({ path: (process.env.OUT ?? 'dev/shots/live-desktop-pt.png').replace('pt.png', 'en.png') })

console.log('click PORTUGUÊS:', await clickByText(['PORTUGUÊS'], true))
await new Promise((r) => setTimeout(r, 900))
const back = await readState()
console.log('=== back to PT ===')
console.log(JSON.stringify(back.text.slice(0, 12), null, 1))

console.log('--- console errors ---')
console.log(errors.slice(0, 8).join('\n') || '(none)')
await browser.close()
