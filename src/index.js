/**
 * SALDO DEEPSEEK HARNESS — host half (Node).
 *
 * Lê o saldo da conta DeepSeek já conectada ao Harness (carteira de recarga +
 * carteira de bônus), busca a cotação USD→CNY do dia e serve um resumo
 * agregado em yuan para a metade client (a página em Configurações).
 *
 * Fonte do saldo (mesma do AGENTS.md do usuário):
 *   GET https://platform.deepseek.com/api/v0/users/get_user_summary
 *   header x-dsh-auth-token: token do registro
 *   `deepseek-account-platform/default` em $DSH_HOME/.credentials.yaml
 *   (+ x-client-platform / x-client-locale / x-client-timezone-offset)
 *
 * Regras de ouro:
 *  - Nenhum segredo trafega para o navegador: o token da conta nunca sai do
 *    host; a rota devolve só números e metadados.
 *  - O navegador só lê o cache local do host (requisições minúsculas). O host
 *    é quem consulta a DeepSeek e o provedor de câmbio, com TTL e dedupe.
 *  - Falhas preservam o último valor bom (stale-while-revalidate) e expõem o
 *    motivo, em vez de zerar o saldo.
 */

import { aggregateWallets, parseWallets } from './summary.js'

/** Nome do plugin (id do Loader e prefixo de rotas). */
export const name = 'saldo-deepseek-harness'

/** Namespace da rota HTTP servida ao navegador. */
export const ROUTE = '/saldo-deepseek-harness/summary'

/** Chave do registro de credencial da conta da Plataforma DeepSeek. */
export const CREDENTIAL_KEY = 'deepseek-account-platform/default'

/** Configuração padrão; qualquer campo pode ser sobrescrito no patch do perfil. */
export const DEFAULT_CONFIG = {
  /** Origem da Plataforma DeepSeek. */
  platformOrigin: 'https://platform.deepseek.com',
  /** Endpoint público da cotação USD→CNY (fonte indicada nas instruções do usuário). */
  rateUrl: 'https://open.er-api.com/v6/latest/USD',
  /** TTL do saldo no host. O navegador sempre lê este cache. */
  balanceRefreshMs: 5 * 60 * 1000,
  /** TTL da cotação (câmbio do dia; 6h evita bater no provedor à toa). */
  rateRefreshMs: 6 * 60 * 60 * 1000,
  /** Idade mínima forçada da cotação para um "Atualizar" também rebuscá-la. */
  rateForceMinAgeMs: 10 * 60 * 1000,
  /** Timeout de cada requisição externa. */
  timeoutMs: 10_000,
  /** Intervalo mínimo entre dois "Atualizar" (proteção contra clique repetido). */
  forceCooldownMs: 2_000,
}

/** Arredonda para centavos sem erro de ponto flutuante visível. */
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Normaliza um número vindo da configuração. */
function numberOr(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Mensagem curta e legível de qualquer erro. */
function messageOf(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Monta a metade host.
 * @param {import('@deepseek-ai/cordis').Context} ctx contexto do plugin.
 * @param {Partial<typeof DEFAULT_CONFIG>} [config] configuração do patch.
 */
export function apply(ctx, config = {}) {
  const platformOrigin = typeof config?.platformOrigin === 'string' && config.platformOrigin.length > 0
    ? config.platformOrigin.replace(/\/+$/, '')
    : DEFAULT_CONFIG.platformOrigin
  const options = {
    rateUrl: typeof config?.rateUrl === 'string' && config.rateUrl.length > 0 ? config.rateUrl : DEFAULT_CONFIG.rateUrl,
    balanceRefreshMs: numberOr(config?.balanceRefreshMs, DEFAULT_CONFIG.balanceRefreshMs),
    rateRefreshMs: numberOr(config?.rateRefreshMs, DEFAULT_CONFIG.rateRefreshMs),
    rateForceMinAgeMs: numberOr(config?.rateForceMinAgeMs, DEFAULT_CONFIG.rateForceMinAgeMs),
    timeoutMs: numberOr(config?.timeoutMs, DEFAULT_CONFIG.timeoutMs),
    forceCooldownMs: numberOr(config?.forceCooldownMs, DEFAULT_CONFIG.forceCooldownMs),
  }

  const balance = {
    data: null,
    fetchedAt: 0,
    lastAttemptAt: 0,
    error: null,
    code: null,
  }
  const rate = {
    data: null,
    fetchedAt: 0,
    lastAttemptAt: 0,
    error: null,
  }
  let inflightBalance = null
  let inflightRate = null
  let lastForcedAt = 0
  /** Serviço de credenciais resolvido pela injeção do Cordis. */
  let credentialsService = null

  ctx.inject(['credentials'], (credentialsCtx) => {
    credentialsService = credentialsCtx.credentials
    void ensureBalance(false)
    return () => {
      credentialsService = null
    }
  })

  /**
   * Descobre a origem da Plataforma usada pela composição. O provider oficial
   * grava a origem no próprio registro (issuer); é a fonte mais fiel e cobre
   * deployments privados. Fallback: config.platformOrigin.
   */
  async function resolveOrigin(payload) {
    if (typeof payload?.issuer === 'string' && /^https?:\/\//.test(payload.issuer)) {
      return payload.issuer.replace(/\/+$/, '')
    }
    return platformOrigin
  }

  /** Lê o token da conta no cofre de credenciais do Harness. */
  async function readToken() {
    const store = credentialsService ?? ctx.get('credentials')
    if (store === undefined || typeof store.readRecord !== 'function') {
      const error = new Error('cofre de credenciais indisponível')
      error.code = 'credentials-unavailable'
      throw error
    }
    const record = await store.readRecord(CREDENTIAL_KEY)
    if (record === undefined || record === null) {
      const error = new Error('nenhuma conta DeepSeek conectada')
      error.code = 'signed-out'
      throw error
    }
    if (record.kind === 'grant' && record.payload !== null && typeof record.payload === 'object' && typeof record.payload.token === 'string' && record.payload.token.length > 0) {
      return { token: record.payload.token, payload: record.payload }
    }
    const error = new Error('registro de conta sem token utilizável')
    error.code = 'signed-out'
    throw error
  }

  /**
   * Consulta o saldo da conta conectada. `signed-out`, `unauthorized` e
   * `balance-failed` são estados tratados pela UI; falha de rede mantém o
   * último saldo bom (stale-while-revalidate).
   */
  function refreshBalance() {
    if (inflightBalance !== null) return inflightBalance
    inflightBalance = (async () => {
      balance.lastAttemptAt = Date.now()
      try {
        const { token, payload } = await readToken()
        const origin = await resolveOrigin(payload)
        const response = await fetch(origin + '/api/v0/users/get_user_summary', {
          headers: {
            accept: 'application/json',
            'x-dsh-auth-token': token,
            'x-client-platform': 'web',
            'x-client-locale': 'en_US',
            'x-client-timezone-offset': String(-new Date().getTimezoneOffset() * 60),
          },
          signal: AbortSignal.timeout(options.timeoutMs),
        })
        if (response.status === 401) {
          const error = new Error('a conta conectada foi recusada pela Plataforma (401)')
          error.code = 'unauthorized'
          throw error
        }
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`)
          error.code = 'balance-failed'
          throw error
        }
        const body = await response.json()
        const code = Number(body?.code)
        if (Number.isFinite(code) && code !== 0) {
          const error = new Error(`código ${code}: ${typeof body?.msg === 'string' ? body.msg : 'falha da Plataforma'}`)
          error.code = code === 40003 ? 'unauthorized' : 'balance-failed'
          throw error
        }
        const data = body?.data?.biz_data
        if (data === null || typeof data !== 'object') {
          const error = new Error('resposta sem dados de saldo')
          error.code = 'balance-failed'
          throw error
        }
        balance.data = {
          normal: parseWallets(data.normal_wallets),
          bonus: parseWallets(data.bonus_wallets),
        }
        balance.error = null
        balance.code = null
        balance.fetchedAt = Date.now()
      } catch (error) {
        balance.error = messageOf(error)
        balance.code = typeof error?.code === 'string' ? error.code : 'balance-failed'
        balance.fetchedAt = Date.now()
      } finally {
        inflightBalance = null
      }
    })()
    return inflightBalance
  }

  /**
   * Consulta a cotação USD→CNY. Em falha mantém o último valor bom e guarda o
   * erro; a UI mostra a cotação antiga com o aviso de desatualizada.
   */
  function refreshRate() {
    if (inflightRate !== null) return inflightRate
    inflightRate = (async () => {
      rate.lastAttemptAt = Date.now()
      try {
        const response = await fetch(options.rateUrl, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(options.timeoutMs),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        const usdCny = Number(payload?.rates?.CNY)
        if (!Number.isFinite(usdCny) || usdCny <= 0) throw new Error('cotação CNY ausente na resposta')
        rate.data = {
          usdCny,
          source: 'open.er-api.com',
          sourceUpdatedUnix: Number.isFinite(Number(payload?.time_last_update_unix)) ? Number(payload.time_last_update_unix) : null,
          sourceUpdatedText: typeof payload?.time_last_update_utc === 'string' ? payload.time_last_update_utc : null,
        }
        rate.fetchedAt = Date.now()
        rate.error = null
      } catch (error) {
        rate.error = messageOf(error)
        if (rate.data === null) rate.fetchedAt = Date.now()
      } finally {
        inflightRate = null
      }
    })()
    return inflightRate
  }

  /** Intervalo mínimo entre tentativas depois de uma falha (evita martelar a API). */
  const RETRY_BACKOFF_MS = 15_000

  /** Garante o cache do saldo conforme TTL/força. */
  async function ensureBalance(force) {
    const now = Date.now()
    const fresh = balance.data !== null && now - balance.fetchedAt <= options.balanceRefreshMs && balance.code === null
    if (fresh && !force) return
    if (force) {
      if (now - lastForcedAt < options.forceCooldownMs && balance.data !== null) return
      lastForcedAt = now
    } else if (balance.code !== null && now - balance.lastAttemptAt < RETRY_BACKOFF_MS) {
      // Última tentativa falhou há pouco: devolve o cache/estado atual.
      return
    }
    await refreshBalance()
  }

  /** Garante a cotação; "Atualizar" só rebusca quando ela está velha. */
  async function ensureRate(force) {
    const now = Date.now()
    if (rate.data !== null && now - rate.fetchedAt <= options.rateRefreshMs) return
    if (force && rate.data !== null && now - rate.fetchedAt < options.rateForceMinAgeMs) return
    if (!force && rate.lastAttemptAt > 0 && now - rate.lastAttemptAt < RETRY_BACKOFF_MS) return
    await refreshRate()
  }

  /** Monta o resumo agregado consumido pela página em Configurações. */
  function serialize() {
    const now = Date.now()
    const normal = balance.data?.normal ?? []
    const bonus = balance.data?.bonus ?? []
    const usdCny = rate.data?.usdCny ?? null
    const aggregated = aggregateWallets({ normal, bonus }, usdCny)

    const ok = balance.data !== null && aggregated.conversionAvailable && balance.code === null
    let code = null
    if (balance.code === 'signed-out' || balance.code === 'unauthorized') code = balance.code
    else if (balance.code === 'credentials-unavailable' || balance.code === 'account-unavailable') code = 'credentials-unavailable'
    else if (balance.data === null && balance.code !== null) code = balance.code
    else if (!aggregated.conversionAvailable) code = 'rate-unavailable'

    return {
      ok,
      code,
      fetchedAt: balance.fetchedAt || null,
      serverNow: now,
      stale: balance.error !== null && balance.data !== null,
      error: balance.error ?? (aggregated.conversionAvailable ? null : rate.error ?? 'cotação indisponível'),
      balance: balance.data === null
        ? null
        : {
            wallets: { recharge: normal, bonus },
            /** Valores originais por moeda (sem conversão). */
            cny: aggregated.cny,
            usd: aggregated.usd,
            /** Valores em yuan quando a conversão é possível; null caso falte cotação. */
            converted: aggregated.converted,
          },
      rate: rate.data === null
        ? null
        : {
            usdCny: rate.data.usdCny,
            source: rate.data.source,
            fetchedAt: rate.fetchedAt,
            sourceUpdatedUnix: rate.data.sourceUpdatedUnix,
            sourceUpdatedText: rate.data.sourceUpdatedText,
            stale: rate.error !== null,
            error: rate.error,
          },
      config: {
        balanceRefreshMs: options.balanceRefreshMs,
        rateRefreshMs: options.rateRefreshMs,
      },
    }
  }

  /** Envia JSON com no-store (o navegador nunca deve cachear saldo). */
  function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload)
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': Buffer.byteLength(body),
    })
    res.end(body)
  }

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: ROUTE,
      async handler(req, res) {
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
          res.writeHead(405, { Allow: 'GET, HEAD, POST' })
          res.end()
          return
        }
        try {
          const url = new URL(req.url ?? '/', 'http://127.0.0.1')
          const force = req.method === 'POST'
            || url.searchParams.get('force') === '1'
            || url.searchParams.get('force') === 'true'
          // Um "Atualizar" também renova a cotação quando ela já está velha.
          await Promise.all([ensureRate(force), ensureBalance(force)])
        } catch (error) {
          ctx.logger?.warn?.(`[saldo-deepseek-harness] falha ao atualizar: ${messageOf(error)}`)
        }
        if (req.method === 'HEAD') {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          })
          res.end()
          return
        }
        sendJson(res, 200, serialize())
      },
    }), 'saldo-deepseek-harness: summary route')
  })

  // Primeira leitura em segundo plano para a página abrir com dados quentes.
  void ensureRate(false)
}
