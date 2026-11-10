import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aggregateWallets, parseWallets, round2, sumWallets } from '../src/summary.js'

test('round2 arredonda centavos sem ruído de ponto flutuante', () => {
  assert.equal(round2(1.005), 1.01)
  assert.equal(round2(2 * 6.686583), 13.37)
  assert.equal(round2(-0.001), 0)
})

test('parseWallets aceita só CNY/USD com saldo numérico', () => {
  const wallets = parseWallets([
    { currency: 'USD', balance: '2.0000000000000000', token_estimation: '0' },
    { currency: 'CNY', balance: '0.86' },
    { currency: 'EUR', balance: '5' },
    { currency: 'CNY', balance: 'abc' },
    null,
    'x',
  ])
  assert.deepEqual(wallets, [
    { currency: 'USD', balance: '2.0000000000000000' },
    { currency: 'CNY', balance: '0.86' },
  ])
})

test('sumWallets soma por moeda e ignora inválidos', () => {
  const wallets = parseWallets([
    { currency: 'CNY', balance: '1.10' },
    { currency: 'CNY', balance: '2.20' },
    { currency: 'USD', balance: '2' },
  ])
  assert.equal(round2(sumWallets(wallets, 'CNY')), 3.3)
  assert.equal(round2(sumWallets(wallets, 'USD')), 2)
})

test('agrega carteiras USD e CNY com cotação do dia', () => {
  const result = aggregateWallets({
    normal: [
      { currency: 'USD', balance: '2.0000000000000000' },
      { currency: 'CNY', balance: '1.00' },
    ],
    bonus: [{ currency: 'CNY', balance: '0.86' }],
  }, 6.686583)

  assert.deepEqual(result.cny, { recharge: 1, bonus: 0.86, total: 1.86 })
  assert.deepEqual(result.usd, { recharge: 2, bonus: 0, total: 2 })
  assert.equal(result.needsRate, true)
  assert.equal(result.conversionAvailable, true)
  assert.deepEqual(result.converted, {
    rechargeCny: 14.37,
    bonusCny: 0.86,
    totalCny: 15.23,
    rate: 6.686583,
  })
})

test('sem carteira USD não exige cotação', () => {
  const result = aggregateWallets({
    normal: [{ currency: 'CNY', balance: '0.86' }],
    bonus: [],
  }, null)

  assert.equal(result.needsRate, false)
  assert.equal(result.conversionAvailable, true)
  assert.deepEqual(result.converted, { rechargeCny: 0.86, bonusCny: 0, totalCny: 0.86, rate: null })
})

test('carteira USD sem cotação fica sem conversão, mas mantém os valores originais', () => {
  const result = aggregateWallets({
    normal: [{ currency: 'USD', balance: '2' }],
    bonus: [],
  }, null)

  assert.equal(result.needsRate, true)
  assert.equal(result.conversionAvailable, false)
  assert.equal(result.converted, null)
  assert.deepEqual(result.usd, { recharge: 2, bonus: 0, total: 2 })
  assert.deepEqual(result.cny, { recharge: 0, bonus: 0, total: 0 })
})

test('entrada vazia vira zeros', () => {
  const result = aggregateWallets({ normal: [], bonus: [] }, null)
  assert.deepEqual(result.converted, { rechargeCny: 0, bonusCny: 0, totalCny: 0, rate: null })
})
