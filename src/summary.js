/**
 * Pure aggregation helpers for SALDO DEEPSEEK HARNESS.
 *
 * Kept dependency-free and side-effect-free so both the host plugin and the
 * unit tests share exactly one implementation of the money math.
 */

/** Arredonda para centavos sem erro de ponto flutuante visível. */
export function round2(value) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100
  return rounded === 0 ? 0 : rounded
}

/**
 * Converte qualquer coisa em uma lista de carteiras válidas.
 * Aceita apenas as moedas que a Plataforma usa (CNY/USD) e saldos numéricos.
 * @param {unknown} value valor bruto de normal_wallets/bonus_wallets.
 * @returns {{currency: 'CNY'|'USD', balance: string}[]} carteiras válidas.
 */
export function parseWallets(value) {
  if (!Array.isArray(value)) return []
  const wallets = []
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue
    if (item.currency !== 'CNY' && item.currency !== 'USD') continue
    const balance = typeof item.balance === 'string' ? item.balance : String(item.balance)
    if (!Number.isFinite(Number(balance))) continue
    wallets.push({ currency: item.currency, balance })
  }
  return wallets
}

/** Soma as carteiras de uma moeda (ignora valores inválidos). */
export function sumWallets(wallets, currency) {
  let total = 0
  for (const wallet of wallets) {
    if (wallet?.currency !== currency) continue
    const value = Number(wallet.balance)
    if (Number.isFinite(value)) total += value
  }
  return total
}

/**
 * Agrega as carteiras em valores por moeda e em yuan.
 * @param {{normal: {currency: string, balance: string}[], bonus: {currency: string, balance: string}[]}} wallets carteiras lidas da Plataforma.
 * @param {number|null} usdCny cotação USD→CNY, ou null quando indisponível.
 * @returns {{
 *   cny: {recharge: number, bonus: number, total: number},
 *   usd: {recharge: number, bonus: number, total: number},
 *   needsRate: boolean,
 *   conversionAvailable: boolean,
 *   converted: {rechargeCny: number, bonusCny: number, totalCny: number, rate: number|null} | null,
 *   source: {normal: object[], bonus: object[]}
 * }} resumo agregado.
 */
export function aggregateWallets(wallets, usdCny) {
  const normal = Array.isArray(wallets?.normal) ? wallets.normal : []
  const bonus = Array.isArray(wallets?.bonus) ? wallets.bonus : []

  const cny = {
    recharge: sumWallets(normal, 'CNY'),
    bonus: sumWallets(bonus, 'CNY'),
  }
  cny.total = cny.recharge + cny.bonus

  const usd = {
    recharge: sumWallets(normal, 'USD'),
    bonus: sumWallets(bonus, 'USD'),
  }
  usd.total = usd.recharge + usd.bonus

  const needsRate = usd.total > 0
  const conversionAvailable = !needsRate || (typeof usdCny === 'number' && Number.isFinite(usdCny) && usdCny > 0)
  const converted = conversionAvailable
    ? {
        rechargeCny: round2(cny.recharge + usd.recharge * (needsRate ? usdCny : 0)),
        bonusCny: round2(cny.bonus + usd.bonus * (needsRate ? usdCny : 0)),
        totalCny: round2(cny.total + usd.total * (needsRate ? usdCny : 0)),
        rate: needsRate ? usdCny : null,
      }
    : null

  return {
    cny: { recharge: round2(cny.recharge), bonus: round2(cny.bonus), total: round2(cny.total) },
    usd: { recharge: round2(usd.recharge), bonus: round2(usd.bonus), total: round2(usd.total) },
    needsRate,
    conversionAvailable,
    converted,
    source: { normal, bonus },
  }
}
