/**
 * SALDO DEEPSEEK HARNESS — browser half (bundle lazy-CJS).
 *
 * Registra uma seção própria em Configurações ("SALDO DEEPSEEK HARNESS") que
 * mostra o saldo da conta DeepSeek em yuan: total disponível, recarga, bônus,
 * a cotação USD→CNY usada e o horário da última leitura.
 *
 * Idioma: a página é PT **ou** EN, escolhido por dois botões no cabeçalho
 * (PORTUGUÊS / INGLÊS). O botão ativo fica desativado; clicar no outro troca o
 * idioma e a preferência é lembrada em localStorage.
 *
 * O navegador só LÊ o cache do host (rota /saldo-deepseek-harness/summary);
 * nenhuma credencial chega aqui. A página se atualiza sozinha a cada 60s
 * enquanto visível e oferece um botão "Atualizar" que força uma consulta nova.
 */
window.__ModuleLoader__.load({
  id: 'dsh-saldo-deepseek-harness',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var h = react.createElement

    //#region styles
    const CSS_ID = 'dsh-saldo-deepseek-harness/styles.css'
    const CSS_TEXT = [
      '.sdh_section{display:flex;flex-direction:column;gap:16px;width:100%;max-width:760px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}',
      '.sdh_intro{margin:0;padding:0 2px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.sdh_group{display:flex;flex-direction:column;gap:12px;padding:20px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-3)}',
      '.sdh_hero{gap:8px}',
      '.sdh_kicker{display:flex;align-items:center;gap:8px;margin:0;font-size:11px;line-height:16px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap}',
      '.sdh_dot{display:inline-block;width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-state-success-primary,#10b981);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary,#10b981) 16%,transparent)}',
      '.sdh_dot_warn{background:var(--dsw-alias-state-warn-primary,#f59e0b);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 16%,transparent)}',
      '.sdh_dot_error{background:var(--dsw-alias-state-error-primary,#ef4444);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 16%,transparent)}',
      '.sdh_value{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-size:38px;line-height:46px;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums}',
      '.sdh_value_cny{font-size:20px;line-height:28px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.sdh_subline{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.sdh_badge{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font-size:11px;line-height:16px;font-weight:500;background:var(--dsw-alias-accent-soft,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-secondary)}',
      '.sdh_badge_warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 14%,transparent);color:var(--dsw-alias-state-warn-label,#b45309)}',
      '.sdh_head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 2px 4px;font-size:13px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.sdh_rows{display:flex;flex-direction:column}',
      '.sdh_row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:11px 2px;border-top:1px solid var(--dsw-alias-border-l2)}',
      '.sdh_row:first-child{border-top:none;padding-top:4px}',
      '.sdh_row_total{border-top:1px solid var(--dsw-alias-border-l2)}',
      '.sdh_row_label{display:flex;flex-direction:column;gap:1px;min-width:0}',
      '.sdh_row_title{font-size:13px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.sdh_row_desc{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.sdh_row_value{display:flex;flex-direction:column;align-items:flex-end;gap:1px;text-align:right;flex:none}',
      '.sdh_amount{font-size:15px;line-height:22px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.sdh_amount_soft{font-size:12px;line-height:18px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.sdh_rate{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}',
      '.sdh_rate_value{font-size:22px;line-height:30px;font-weight:650;font-variant-numeric:tabular-nums}',
      '.sdh_footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:0 2px}',
      '.sdh_footer_time{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.sdh_actions{display:flex;align-items:center;gap:8px}',
      '.sdh_btn{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:background .12s ease,border-color .12s ease}',
      '.sdh_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-label-dimmed)}',
      '.sdh_btn:disabled{cursor:default;opacity:.6}',
      '.sdh_btn_primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#3b82f6));color:var(--dsw-alias-label-primary-foreground,#fff);font-weight:600}',
      '.sdh_btn_primary:hover:not(:disabled){filter:brightness(1.08);background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary,#3b82f6))}',
      '.sdh_spin{animation:sdh_rot .8s linear infinite}',
      '@keyframes sdh_rot{to{transform:rotate(360deg)}}',
      '.sdh_skeleton{display:flex;flex-direction:column;gap:10px}',
      '.sdh_sk{height:14px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);animation:sdh_pulse 1.2s ease-in-out infinite}',
      '.sdh_sk_tall{height:38px;border-radius:10px}',
      '@keyframes sdh_pulse{0%,100%{opacity:.55}50%{opacity:1}}',
      '.sdh_state_title{display:flex;align-items:center;gap:8px;margin:0;font-size:14px;line-height:22px;font-weight:600}',
      '.sdh_state_desc{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.sdh_error{margin:0;font-size:11px;line-height:17px;color:var(--dsw-alias-state-error-primary,#ef4444);word-break:break-word}',
      '.sdh_warn{margin:0;font-size:11px;line-height:17px;color:var(--dsw-alias-state-warn-label,#b45309)}',
      '.sdh_note{margin:0;font-size:11px;line-height:17px;color:var(--dsw-alias-label-tertiary)}',
      // Alternador de idioma no cabeçalho de Configurações.
      '.sdh_lang{display:flex;align-items:center;gap:6px}',
      '.sdh_lang_btn{height:28px;padding:0 11px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:16px;font-weight:600;letter-spacing:.04em;cursor:pointer;transition:background .12s ease,border-color .12s ease,color .12s ease}',
      '.sdh_lang_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-label-dimmed)}',
      '.sdh_lang_on,.sdh_lang_on:disabled{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#3b82f6));border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff);opacity:1;cursor:default}',
      // Enquanto a nossa seção está aberta, os botões de idioma ocupam o lugar
      // do botão global "Abra o arquivo de configuração" (registro de outro plugin).
      '[data-slot="settings.action"]:has(> .sdh_lang) > :not(.sdh_lang){display:none!important}',
    ].join('\n')

    function ensureStyles() {
      if (typeof document === 'undefined') return
      let tag = document.querySelector('style[data-plugin-css="' + CSS_ID + '"]')
      if (tag === null) {
        tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-saldo-deepseek-harness'
        tag.dataset.pluginCss = CSS_ID
        document.head.appendChild(tag)
      }
      tag.textContent = CSS_TEXT
    }
    //#endregion

    //#region copy (PT + EN; o idioma ativo é escolhido pelos botões do cabeçalho)
    const LANGS = ['pt', 'en']

    const COPY = {
      pt: {
        nav: 'SALDO DEEPSEEK HARNESS',
        pt: 'PORTUGUÊS',
        en: 'INGLÊS',
        intro: 'Saldo da sua conta DeepSeek, sempre em yuan (CNY).',
        loading: 'Carregando saldo…',
        total: 'Total disponível',
        recharge: 'Recarga',
        bonus: 'Bônus',
        composition: 'Composição',
        convertedNote: 'Valores em USD convertidos pela cotação abaixo.',
        rateTitle: 'Cotação USD → CNY',
        rateSource: 'fonte',
        rateProviderTime: 'cotação do provedor em',
        updated: 'Atualizado em',
        autoRefresh: 'Atualização automática a cada 5 minutos',
        refresh: 'Atualizar',
        refreshing: 'Atualizando…',
        stale: 'desatualizado',
        yuan: 'yuan (CNY)',
        usdOriginal: 'original em USD',
        noConversion: 'sem conversão',
        cnyOnly: 'Exibindo apenas a parte em CNY',
        signedOutTitle: 'Nenhuma conta DeepSeek conectada',
        signedOutDesc: 'Entre em Configurações › Conta para que o plugin consiga ler o saldo.',
        unauthorizedTitle: 'A conta conectada foi recusada',
        unauthorizedDesc: 'Reconecte em Configurações › Conta e tente novamente.',
        errorTitle: 'Não foi possível ler o saldo agora',
        errorDesc: 'O último valor conhecido é mantido abaixo quando existe.',
        credentialsUnavailable: 'O cofre de credenciais do Harness não está disponível.',
        rateUnavailable: 'Cotação indisponível: os valores em USD aparecem sem conversão.',
      },
      en: {
        nav: 'SALDO DEEPSEEK HARNESS',
        pt: 'PORTUGUÊS',
        en: 'INGLÊS',
        intro: 'Your DeepSeek account balance, always in yuan (CNY).',
        loading: 'Loading balance…',
        total: 'Total available',
        recharge: 'Top-up',
        bonus: 'Granted bonus',
        composition: 'Breakdown',
        convertedNote: 'USD amounts converted with the rate below.',
        rateTitle: 'USD → CNY exchange rate',
        rateSource: 'source',
        rateProviderTime: 'provider update',
        updated: 'Updated',
        autoRefresh: 'Auto-refresh every 5 minutes',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        stale: 'stale',
        yuan: 'yuan (CNY)',
        usdOriginal: 'original in USD',
        noConversion: 'not converted',
        cnyOnly: 'Showing the CNY part only',
        signedOutTitle: 'No DeepSeek account connected',
        signedOutDesc: 'Sign in under Settings › Account so the plugin can read your balance.',
        unauthorizedTitle: 'The connected account was rejected',
        unauthorizedDesc: 'Reconnect under Settings › Account and try again.',
        errorTitle: 'Could not read the balance right now',
        errorDesc: 'The last known value is kept below when available.',
        credentialsUnavailable: 'The Harness credential store is not available.',
        rateUnavailable: 'Exchange rate unavailable: USD amounts are shown without conversion.',
      },
    }
    //#endregion

    //#region shared UI state (idioma + seção ativa)
    const STORAGE_KEY = 'dsh-saldo-deepseek-harness/lang'

    function readStoredLang() {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored === 'pt' || stored === 'en') return stored
      } catch {
        // sem localStorage (contexto restrito): usa o padrão
      }
      return 'pt'
    }

    const ui = {
      lang: readStoredLang(),
      active: false,
      listeners: new Set(),
      setLang(next) {
        if (!LANGS.includes(next) || next === ui.lang) return
        ui.lang = next
        try {
          window.localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // preferência só em memória quando o storage está indisponível
        }
        ui.emit()
      },
      setActive(value) {
        if (value === ui.active) return
        ui.active = value
        ui.emit()
      },
      subscribe(listener) {
        ui.listeners.add(listener)
        return () => {
          ui.listeners.delete(listener)
        }
      },
      emit() {
        for (const listener of [...ui.listeners]) {
          try {
            listener()
          } catch {
            // um assinante quebrado não derruba os demais
          }
        }
      },
    }

    /** Hook que re-renderiza o componente quando idioma/seção ativa mudam. */
    function useUi() {
      const [, force] = react.useReducer((tick) => tick + 1, 0)
      react.useEffect(() => ui.subscribe(force), [])
      return ui
    }
    //#endregion

    //#region format
    function localeOf(lang) {
      return lang === 'en' ? 'en-US' : 'pt-BR'
    }

    const numberFormatters = new Map()
    function numberFormat(lang, options) {
      const key = lang + '|' + JSON.stringify(options)
      let formatter = numberFormatters.get(key)
      if (formatter === undefined) {
        try {
          formatter = new Intl.NumberFormat(localeOf(lang), options)
        } catch {
          formatter = null
        }
        numberFormatters.set(key, formatter)
      }
      return formatter
    }

    function formatCny(value, lang) {
      if (!Number.isFinite(value)) return '—'
      const formatter = numberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return '¥ ' + (formatter !== null ? formatter.format(value) : value.toFixed(2))
    }

    function formatUsd(value, lang) {
      if (!Number.isFinite(value)) return '—'
      const formatter = numberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const amount = formatter !== null ? formatter.format(value) : value.toFixed(2)
      return lang === 'en' ? '$' + amount : 'US$ ' + amount
    }

    function formatRate(value, lang) {
      if (!Number.isFinite(value)) return '—'
      const formatter = numberFormat(lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
      return formatter !== null ? formatter.format(value) : value.toFixed(4)
    }

    function formatDateTime(ms, lang) {
      if (!Number.isFinite(ms) || ms <= 0) return '—'
      try {
        return new Intl.DateTimeFormat(localeOf(lang), {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date(ms))
      } catch {
        return '—'
      }
    }

    function formatClock(ms, lang) {
      if (!Number.isFinite(ms) || ms <= 0) return '—'
      try {
        return new Intl.DateTimeFormat(localeOf(lang), { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(ms))
      } catch {
        return '—'
      }
    }
    //#endregion

    //#region data
    const API = '/saldo-deepseek-harness/summary'
    const POLL_MS = 60_000

    async function readSummary(force) {
      const url = force ? API + '?force=1' : API
      const response = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return await response.json()
    }

    function useSummary() {
      const [state, setState] = react.useState({ phase: 'loading', data: null, error: null, refreshing: false })
      const alive = react.useRef(true)

      const load = react.useCallback(async (force) => {
        setState((previous) => ({ ...previous, refreshing: true }))
        try {
          const data = await readSummary(force === true)
          if (alive.current) setState({ phase: 'ready', data, error: null, refreshing: false })
        } catch (error) {
          if (alive.current) {
            const message = error instanceof Error ? error.message : String(error)
            setState((previous) => ({ phase: previous.data === null ? 'error' : 'ready', data: previous.data, error: message, refreshing: false }))
          }
        }
      }, [])

      react.useEffect(() => {
        alive.current = true
        void load(false)
        const timer = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
          void load(false)
        }, POLL_MS)
        const onVisible = () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') void load(false)
        }
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
        return () => {
          alive.current = false
          clearInterval(timer)
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
        }
      }, [load])

      return { state, refresh: () => void load(true) }
    }
    //#endregion

    //#region icons
    function RefreshIcon(props) {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        className: props?.spinning ? 'sdh_spin' : undefined,
      }, h('path', {
        d: 'M13.2 8a5.2 5.2 0 1 1-1.6-3.7',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
      }), h('path', {
        d: 'M13.4 2.6v2.6h-2.6',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }))
    }
    //#endregion

    //#region language switch (settings.action)
    /**
     * Dois botões no cabeçalho de Configurações, no lugar do botão global de
     * abrir o arquivo de configuração enquanto esta seção está aberta.
     */
    function LanguageSwitch() {
      const state = useUi()
      if (state.active !== true) return null
      const c = COPY[state.lang]
      const button = (key, label) => h('button', {
        type: 'button',
        key,
        className: 'sdh_lang_btn' + (state.lang === key ? ' sdh_lang_on' : ''),
        onClick: () => ui.setLang(key),
        disabled: state.lang === key,
        'aria-pressed': state.lang === key,
      }, label)
      return h('div', { className: 'sdh_lang', role: 'group', 'aria-label': 'Idioma / Language' },
        button('pt', c.pt),
        button('en', c.en))
    }
    //#endregion

    //#region render
    function sectionIntro(c) {
      return h('p', { className: 'sdh_intro' }, c.intro)
    }

    function loadingCard(c) {
      return h('div', { className: 'sdh_group', 'aria-busy': 'true' },
        h('div', { className: 'sdh_skeleton' },
          h('div', { className: 'sdh_sk', style: { width: '32%' } }),
          h('div', { className: 'sdh_sk sdh_sk_tall', style: { width: '52%' } }),
          h('div', { className: 'sdh_sk', style: { width: '40%' } })),
        h('p', { className: 'sdh_note' }, c.loading))
    }

    function stateCard(options) {
      return h('div', { className: 'sdh_group' },
        h('p', { className: 'sdh_state_title' },
          h('span', { className: 'sdh_dot ' + (options.tone === 'error' ? 'sdh_dot_error' : 'sdh_dot_warn') }),
          options.title),
        h('p', { className: 'sdh_state_desc' }, options.desc),
        options.detail ? h('p', { className: 'sdh_error' }, options.detail) : null)
    }

    function statusTone(data) {
      if (data === null) return 'error'
      if (data.ok !== true || data.stale === true) return 'warn'
      return 'ok'
    }

    /** Valor em yuan de uma linha; null quando só há USD sem cotação. */
    function displayCny(convertedValue, cnyValue, usdValue) {
      if (convertedValue !== null) return convertedValue
      if (usdValue > 0) return null
      return cnyValue
    }

    function amountRows(data, lang, c) {
      const balance = data.balance
      const converted = balance?.converted ?? null
      const rows = []

      const rechargeValue = displayCny(converted?.rechargeCny ?? null, balance.cny.recharge, balance.usd.recharge)
      const bonusValue = displayCny(converted?.bonusCny ?? null, balance.cny.bonus, balance.usd.bonus)

      const row = (key, title, value, usdValue, cnyValue) => {
        const desc = usdValue > 0
          ? formatUsd(usdValue, lang) + ' ' + c.usdOriginal + (converted === null ? ' · ' + c.noConversion : '')
          : null
        return h('div', { className: 'sdh_row', key },
          h('div', { className: 'sdh_row_label' },
            h('span', { className: 'sdh_row_title' }, title),
            desc !== null ? h('span', { className: 'sdh_row_desc' }, desc) : null),
          h('div', { className: 'sdh_row_value' },
            h('span', { className: 'sdh_amount' }, value === null ? '—' : formatCny(value, lang)),
            converted !== null && usdValue > 0 && cnyValue > 0
              ? h('span', { className: 'sdh_amount_soft' }, formatCny(cnyValue, lang) + ' CNY + ' + formatUsd(usdValue, lang))
              : null))
      }

      rows.push(row('recharge', c.recharge, rechargeValue, balance.usd.recharge, balance.cny.recharge))
      rows.push(row('bonus', c.bonus, bonusValue, balance.usd.bonus, balance.cny.bonus))

      const totalValue = converted !== null
        ? converted.totalCny
        : (balance.usd.total > 0 ? null : balance.cny.total)
      rows.push(h('div', { className: 'sdh_row sdh_row_total', key: 'total' },
        h('div', { className: 'sdh_row_label' },
          h('span', { className: 'sdh_row_title' }, c.total)),
        h('div', { className: 'sdh_row_value' },
          h('span', { className: 'sdh_amount' }, totalValue === null ? '—' : formatCny(totalValue, lang)))))

      return rows
    }

    function heroCard(data, lang, c) {
      const converted = data.balance?.converted ?? null
      const total = converted !== null
        ? converted.totalCny
        : (data.balance?.usd.total > 0 ? null : data.balance?.cny.total)
      const tone = statusTone(data)
      const dotClass = tone === 'ok' ? 'sdh_dot' : tone === 'warn' ? 'sdh_dot sdh_dot_warn' : 'sdh_dot sdh_dot_error'
      const badges = []
      if (data.stale === true) badges.push(h('span', { className: 'sdh_badge sdh_badge_warn', key: 'stale' }, c.stale))
      if (converted === null) badges.push(h('span', { className: 'sdh_badge sdh_badge_warn', key: 'partial' }, c.cnyOnly))

      return h('div', { className: 'sdh_group sdh_hero' },
        h('p', { className: 'sdh_kicker' },
          h('span', { className: dotClass, 'aria-hidden': true }),
          h('span', null, c.total),
          badges),
        h('div', { className: 'sdh_value', 'aria-live': 'polite' },
          h('span', null, total === null ? '—' : formatCny(total, lang)),
          total === null ? null : h('span', { className: 'sdh_value_cny' }, c.yuan)),
        h('p', { className: 'sdh_subline' },
          data.fetchedAt !== null
            ? c.updated + ' ' + formatDateTime(data.fetchedAt, lang)
            : c.loading))
    }

    function compositionCard(data, lang, c) {
      if (data.balance === null) return null
      const converted = data.balance.converted ?? null
      return h('div', { className: 'sdh_group' },
        h('div', { className: 'sdh_head' },
          h('span', null, c.composition)),
        converted !== null
          ? h('p', { className: 'sdh_note' }, c.convertedNote)
          : h('p', { className: 'sdh_warn' }, c.rateUnavailable),
        h('div', { className: 'sdh_rows' }, amountRows(data, lang, c)))
    }

    function rateCard(data, lang, c) {
      const rate = data.rate
      if (rate === null) return null
      const providerTime = rate.sourceUpdatedUnix !== null && rate.sourceUpdatedUnix > 0
        ? formatDateTime(rate.sourceUpdatedUnix * 1000, lang)
        : (typeof rate.sourceUpdatedText === 'string' && rate.sourceUpdatedText.length > 0 ? rate.sourceUpdatedText : '—')
      return h('div', { className: 'sdh_group' },
        h('div', { className: 'sdh_rate' },
          h('div', { className: 'sdh_row_label' },
            h('span', { className: 'sdh_row_title' }, c.rateTitle),
            h('span', { className: 'sdh_row_desc' }, c.rateSource + ': ' + rate.source)),
          h('span', { className: 'sdh_rate_value' }, '1 USD = ¥ ' + formatRate(rate.usdCny, lang))),
        h('p', { className: 'sdh_note' }, c.rateProviderTime + ': ' + providerTime),
        rate.stale === true && typeof rate.error === 'string'
          ? h('p', { className: 'sdh_warn' }, rate.error)
          : null)
    }

    function footer(state, c, onRefresh) {
      return h('div', { className: 'sdh_footer' },
        h('span', { className: 'sdh_footer_time' }, c.autoRefresh),
        h('div', { className: 'sdh_actions' },
          h('button', {
            type: 'button',
            className: 'sdh_btn sdh_btn_primary',
            onClick: onRefresh,
            disabled: state.refreshing === true,
          },
          h(RefreshIcon, { spinning: state.refreshing === true }),
          state.refreshing === true ? c.refreshing : c.refresh)))
    }

    function SaldoSection() {
      const uiState = useUi()
      const lang = uiState.lang
      const c = COPY[lang]
      const { state, refresh } = useSummary()
      const data = state.data
      const children = [sectionIntro(c)]

      // A página está montada somente quando esta seção está ativa: usa isso
      // para o alternador de idioma ocupar o cabeçalho e para o auto-refresh
      // não rodar escondido.
      react.useEffect(() => {
        ui.setActive(true)
        return () => ui.setActive(false)
      }, [])

      if (state.phase === 'loading' && data === null) {
        children.push(loadingCard(c))
      } else if (data === null) {
        children.push(stateCard({
          tone: 'error',
          title: c.errorTitle,
          desc: c.errorDesc,
          detail: state.error !== null ? state.error : '',
        }))
      } else if (data.code === 'signed-out' || data.code === 'unauthorized' || data.code === 'credentials-unavailable' || data.balance === null) {
        const signedOut = data.code === 'signed-out'
        const unauthorized = data.code === 'unauthorized'
        const noCredentials = data.code === 'credentials-unavailable'
        children.push(stateCard({
          tone: signedOut ? 'warn' : 'error',
          title: signedOut ? c.signedOutTitle : (unauthorized ? c.unauthorizedTitle : c.errorTitle),
          desc: signedOut ? c.signedOutDesc : (unauthorized ? c.unauthorizedDesc : (noCredentials ? c.credentialsUnavailable : c.errorDesc)),
          detail: typeof data.error === 'string' && data.error.length > 0 ? data.error : '',
        }))
      } else {
        children.push(heroCard(data, lang, c))
        children.push(compositionCard(data, lang, c))
        children.push(rateCard(data, lang, c))
        if (state.error !== null) {
          children.push(h('p', { className: 'sdh_warn', key: 'inline-error' }, c.errorDesc + ' ' + state.error))
        }
      }

      children.push(footer(state, c, refresh))
      return h('div', { className: 'sdh_section' }, children)
    }
    //#endregion

    //#region plugin
    function apply(ctx) {
      ensureStyles()

      ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
        name: 'settings.section.icon',
        id: 'saldo-deepseek-harness',
        order: 120,
        label: () => COPY[ui.lang].nav,
      }, ({ size }) => h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
      },
      h('circle', { cx: 8, cy: 8, r: 6.2, stroke: 'currentColor', strokeWidth: 1.4 }),
      h('path', { d: 'M9.8 5.6c-.5-.5-1.2-.8-1.9-.8-1.1 0-1.9.6-1.9 1.4 0 .9.7 1.2 1.6 1.5l.7.2c1 .3 1.7.7 1.7 1.7 0 .9-.9 1.6-2.1 1.6-.8 0-1.5-.3-2-.8', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      h('path', { d: 'M8 3.9v8.2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }))))

      // Alternador de idioma no cabeçalho, visível apenas com esta seção aberta.
      ctx.slots.inject('settings.action', () => ctx.slots.register({
        name: 'settings.action',
        id: 'saldo-deepseek-harness-language',
        order: 5,
        label: () => 'Idioma / Language',
      }, LanguageSwitch))

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'saldo-deepseek-harness',
        order: 120,
        label: () => COPY[ui.lang].nav,
      }, SaldoSection))
    }

    exports.apply = apply
    exports.inject = ['slots']
    return module.exports
  },
})
