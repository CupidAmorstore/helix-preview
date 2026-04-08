/**
 * HELIX - app.js v3.0
 * Market Intelligence Engine (Preview)
 *
 * Data sources:
 *  - Binance WebSocket -> real-time price streaming (primary)
 *  - CoinGecko REST API -> 24h chart historical data + market stats
 *
 * Architecture:
 *  - WebSocket live feed -> ticker + price header always fresh
 *  - CoinGecko REST poll (60s) -> market cards, volume, 24h change
 *  - Analysis engine     -> multi-factor market signal + regime
 *  - No fake data        -> stale state always labeled
 */
(function () {
  'use strict';

  /* ================================================================
     CONFIG
     ================================================================ */
  const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
  const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/stream?streams=';

  const COINS = [
    { id: 'bitcoin',     symbol: 'BTC', name: 'Bitcoin',     binance: 'btcusdt' },
    { id: 'ethereum',    symbol: 'ETH', name: 'Ethereum',    binance: 'ethusdt' },
    { id: 'solana',      symbol: 'SOL', name: 'Solana',      binance: 'solusdt' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB',         binance: 'bnbusdt' },
    { id: 'ripple',      symbol: 'XRP', name: 'XRP',         binance: 'xrpusdt' },
    { id: 'dogecoin',    symbol: 'DOGE', name: 'Dogecoin',    binance: 'dogeusdt' },
    { id: 'polkadot',    symbol: 'DOT', name: 'Polkadot',    binance: 'dotusdt' },
    { id: 'matic-network', symbol: 'MATIC', name: 'Polygon',   binance: 'maticusdt' },
  ];

  const CHART_COINS = { 
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
    DOGE: 'dogecoin', MATIC: 'matic-network', DOT: 'polkadot'
  };
  const COINGECKO_REFRESH_MS = 60_000; // 60s for REST polling (rate-limit safe)

  /* ================================================================
     STATE
     ================================================================ */
  let priceCache     = {};    // { coinId: { usd, usd_24h_change, usd_24h_vol } }
  let wsLivePrices   = {};    // { symbol: price } - streaming from Binance WS
  let chartData      = {};    // { symbol: { tf: [[ts, price], ...] } }
  let currentChart   = 'BTC';
  let currentTimeframe = '1D';
  let wsConn         = null;
  let wsReconnects   = 0;
  let wsHeartbeat    = null;
  let lastDataTs     = null;  // last REST data timestamp
  let isOnline       = navigator.onLine;

  /* ================================================================
     DOM REFS
     ================================================================ */
  let $marketCards, $tickerInner, $liveBadge, $liveText;
  let $canvas, $chartPrice, $chartChange, $chartUpdated, $chartLabel;
  let $regimeBadge, $regimeValue, $regimeFreshness;

  /* ================================================================
     FORMATTERS
     ================================================================ */
  const fmt = {
    usd: (n) => {
      if (!isFinite(n)) return '-';
      if (n >= 1000)  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (n >= 1)     return '$' + n.toFixed(4);
      return '$' + n.toFixed(6);
    },
    usdShort: (n) => {
      if (!isFinite(n)) return '-';
      if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
      if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K';
      return '$' + n.toFixed(2);
    },
    pct: (n) => {
      if (!isFinite(n)) return '-';
      const sign = n >= 0 ? '+' : '';
      return sign + n.toFixed(2) + '%';
    },
    vol: (n) => {
      if (!isFinite(n)) return '-';
      if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
      return '$' + (n / 1e3).toFixed(0) + 'K';
    },
    time: (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    timeShort: (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    age: (ms) => {
      if (ms < 60_000) return 'Just now';
      if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
      return `${Math.round(ms / 3600_000)}h ago`;
    },
  };

  const el  = (id) => document.getElementById(id);
  const qs  = (s, ctx = document) => ctx.querySelector(s);
  const qsa = (s, ctx = document) => ctx.querySelectorAll(s);

  
  const signalTagLabel = (signal) => {
    if (!signal) return '-';
    if (signal === 'UPWARD BIAS') return 'UPWARD BIAS';
    if (signal === 'DOWNWARD BIAS') return 'DOWNWARD BIAS';
    if (signal === 'NO ACTION') return 'NO ACTION';
    if (signal === 'WATCH') return 'WATCH';
    return signal;
  };

  const signalSetupLabel = (signal) => {
    if (!signal) return '-';
    if (signal === 'NO ACTION') return 'Market Neutral';
    if (signal === 'WATCH') return 'Watch';
    if (signal === 'UPWARD BIAS') return 'Upward Bias';
    if (signal === 'DOWNWARD BIAS') return 'Downward Bias';
    return signal;
  };

  /* ================================================================
     ANALYSIS ENGINE
     Multi-factor signal scoring with strict NO-ACTION conditions
     ================================================================ */
  /* ================================================================
     QUANT / INTELLIGENCE CALCULATORS
     ================================================================ */
  const Quant = {
    // RSI: Relative Strength Index (Standard 14-period)
    rsi: (prices, period = 14) => {
      if (!prices || prices.length <= period) return 50;
      let gains = 0, losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = prices[i][1] - prices[i - 1][1];
        if (diff >= 0) gains += diff; else losses -= diff;
      }
      let avgGain = gains / period, avgLoss = losses / period;
      for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i][1] - prices[i - 1][1];
        const g = diff >= 0 ? diff : 0, l = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + g) / period;
        avgLoss = (avgLoss * (period - 1) + l) / period;
      }
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    },

    // EMA: Exponential Moving Average
    ema: (prices, period) => {
      if (!prices || prices.length < period) return 0;
      const k = 2 / (period + 1);
      let ema = prices.slice(0, period).reduce((a, p) => a + p[1], 0) / period;
      for (let i = period; i < prices.length; i++) {
        ema = (prices[i][1] - ema) * k + ema;
      }
      return ema;
    },

    // ATR: Average True Range (Approximated from close-only data)
    atr: (prices, period = 14) => {
      if (!prices || prices.length <= period) return 0;
      let trSum = 0;
      for (let i = 1; i <= period; i++) {
        trSum += Math.abs(prices[i][1] - prices[i-1][1]);
      }
      let atr = trSum / period;
      for (let i = period + 1; i < prices.length; i++) {
        const tr = Math.abs(prices[i][1] - prices[i-1][1]);
        atr = (atr * (period - 1) + tr) / period;
      }
      return atr;
    }
  };

  /* ================================================================
     ANALYSIS ENGINE (v4.0 - Lead Product Engineering Edition)
     Multi-factor signal scoring with strict NO-ACTION conditions
     ================================================================ */
  function analyzeMarket(coinId, priceData, history) {
    const d = priceData[coinId];
    if (!d || !history || history.length < 30) return null;

    const price = d.usd || 0;
    const vol   = d.usd_24h_vol || 0;
    const chg24 = d.usd_24h_change || 0;

    // Technical Indicators
    const rsiVal = Quant.rsi(history, 14);
    const ema9   = Quant.ema(history, 9);
    const ema21  = Quant.ema(history, 21);
    const atrVal = Quant.atr(history, 14);

    // Factor 1: Trend Alignment (EMA Crossover + Price Location)
    let trendScore = 0;
    if (price > ema9 && ema9 > ema21)      trendScore = 2.0;  // Strong Bullish
    else if (price > ema21)                trendScore = 1.0;  // Weak Bullish
    else if (price < ema9 && ema9 < ema21) trendScore = -2.0; // Strong Bearish
    else if (price < ema21)                trendScore = -1.0; // Weak Bearish

    // Factor 2: Momentum (RSI thresholds)
    let momScore = 0;
    if (rsiVal > 70)      momScore = -1.0; // Overextended Bullish (Risk of reversal)
    else if (rsiVal > 55) momScore = 1.0;  // Healthy Bullish Momentum
    else if (rsiVal < 30) momScore = 1.0;  // Overextended Bearish (Risk of reversal - mean reversion)
    else if (rsiVal < 45) momScore = -1.0; // Healthy Bearish Momentum

    // Factor 3: Volume Conviction
    let volScore = 0;
    if (vol > 1e9)       volScore = 1.0;
    else if (vol < 100e6) volScore = -1.5; // High caution: Low liquidity

    // Total Intelligence Score (-5 to +5)
    let score = trendScore + momScore + volScore;

    // Setup Generation (Quantitative)
    const riskMult = 1.5; // Standard risk multiplier
    const setup = {
      bias: 'NEUTRAL',
      signal: 'NO ACTION',
      confidence: 0,
      risk: 'MEDIUM',
      entry: 0,
      stopLoss: 0,
      takeProfit: 0,
      reasoning: 'Market structure is unclear. Mixed signals across momentum and volume.'
    };

    // Logical Branching for Explanatory Setups
    if (score >= 2.5 && rsiVal < 75) {
      setup.bias = 'BULLISH';
      setup.signal = 'UPWARD BIAS';
      setup.confidence = Math.min(95, 60 + (score * 5));
      setup.risk = rsiVal > 65 ? 'HIGH' : 'LOW';
      setup.entry = price;
      setup.stopLoss = price - (atrVal * 2);
      setup.takeProfit = price + (atrVal * 4);
      setup.reasoning = `Strong trend alignment with ${fmt.pct(chg24)} momentum. Volume confirms institutional interest.`;
    } 
    else if (score <= -2.5 && rsiVal > 25) {
      setup.bias = 'BEARISH';
      setup.signal = 'DOWNWARD BIAS';
      setup.confidence = Math.min(95, 55 + (Math.abs(score) * 5));
      setup.risk = rsiVal < 35 ? 'HIGH' : 'LOW';
      setup.entry = price;
      setup.stopLoss = price + (atrVal * 2);
      setup.takeProfit = price - (atrVal * 4);
      setup.reasoning = `Negative market structure confirmed by EMA rejection. Bearish pressure is accelerating.`;
    }
    else if (Math.abs(score) < 1.5 || vol < 50e6) {
      setup.signal = 'NO ACTION';
      setup.confidence = 20;
      setup.reasoning = vol < 50e6 ? "Liquidity is too low for a reliable setup." : "Conflicting factors between trend and momentum oscillator.";
    } else {
      setup.signal = 'WATCH';
      setup.confidence = 45;
      setup.reasoning = "Conditions are forming but lacking final confluence for a high-probability setup.";
    }

    return {
      ...setup,
      rsi: Math.round(rsiVal),
      ema9, ema21,
      vol, price, chg24,
      ts: Date.now(),
      invalidation: setup.signal === 'UPWARD BIAS' ? `Breach of EMA21 (${fmt.usd(ema21)})` : `Price reclaim of EMA21 (${fmt.usd(ema21)})`,
      factors: [
        { name: 'Trend', value: trendScore > 0 ? 'Bullish' : trendScore < 0 ? 'Bearish' : 'Neutral', ok: Math.abs(trendScore) >= 1 },
        { name: 'RSI', value: rsiVal.toFixed(0), ok: rsiVal > 40 && rsiVal < 60 },
        { name: 'Volume', value: vol > 500e6 ? 'Strong' : 'Weak', ok: vol > 500e6 }
      ]
    };
  }

  // Legacy fallback for market cards (global scope)
  function analyzeMarketLegacy(coinData) {
    const results = {};
    for (const coin of COINS) {
      const d = coinData[coin.id];
      if (!d) { results[coin.id] = null; continue; }
      const change24 = d.usd_24h_change || 0;
      if (Math.abs(change24) < 1) {
        results[coin.id] = { signal: 'NO ACTION', signalClass: 'signal-neutral' };
      } else if (change24 > 3) {
        results[coin.id] = { signal: 'UPWARD BIAS', signalClass: 'signal-upward' };
      } else if (change24 < -3) {
        results[coin.id] = { signal: 'DOWNWARD BIAS', signalClass: 'signal-downward' };
      } else {
        results[coin.id] = { signal: 'WATCH', signalClass: 'signal-watch' };
      }
    }
    return results;
  }

  function computeMarketRegime(analysis) {
    const signals = Object.values(analysis).filter(Boolean);
    if (!signals.length) return { label: 'Uncertain', cls: 'uncertain', reason: 'No data' };

    const buyCount  = signals.filter(s => s.signal === 'UPWARD BIAS').length;
    const sellCount = signals.filter(s => s.signal === 'DOWNWARD BIAS').length;
    const avgChange = signals.reduce((a, s) => a + s.change24, 0) / signals.length;

    if (buyCount >= 3 && avgChange > 2)
      return { label: 'Broadly Bullish', cls: 'bullish', reason: `${buyCount}/${signals.length} assets trending up` };
    if (sellCount >= 3 && avgChange < -2)
      return { label: 'Broadly Bearish', cls: 'bearish', reason: `${sellCount}/${signals.length} assets declining` };
    if (Math.abs(avgChange) < 1)
      return { label: 'Sideways / Neutral', cls: 'neutral', reason: 'Mixed signals, low directional pressure' };
    return { label: 'Mixed - Caution', cls: 'uncertain', reason: 'No clear market consensus' };
  }

  /* ================================================================
     LIVE STATUS
     ================================================================ */
  function setLiveStatus(state, text) {
    if (!$liveBadge || !$liveText) return;
    $liveBadge.className = 'live-badge' + (state === 'error' ? ' error' : '');
    $liveText.textContent = text;
    const dot = qs('.live-dot', $liveBadge);
    if (dot) {
      dot.className = 'live-dot';
      if (state === 'error') dot.classList.add('offline');
    }
  }

  /* ================================================================
     AI DASHBOARD RENDERING (v4.0)
     ================================================================ */
  function renderAIDashboard(coinId, priceData, history) {
    const $dash = el('ai-dashboard');
    if (!$dash) return;

    const analysis = analyzeMarket(coinId, priceData, history);
    if (!analysis) {
      $dash.style.opacity = '0.5';
      $dash.style.pointerEvents = 'none';
      return;
    }

    $dash.style.opacity = '1';
    $dash.style.pointerEvents = 'all';

    // Bias & Meters
    const $bias = el('ai-bias-value');
    if ($bias) {
      $bias.textContent = analysis.bias;
      $bias.className = `bias-value ${analysis.bias.toLowerCase()}`;
    }

    const $confFill = el('ai-conf-fill');
    const $confVal  = el('ai-conf-val');
    if ($confFill) $confFill.style.width = `${analysis.confidence}%`;
    if ($confVal)  $confVal.textContent  = `${analysis.confidence}%`;

    const $riskFill = el('ai-risk-fill');
    const $riskVal  = el('ai-risk-val');
    if ($riskFill) $riskFill.style.width = `${analysis.riskScore || (analysis.risk === 'HIGH' ? 80 : 30)}%`;
    if ($riskVal)  $riskVal.textContent  = analysis.risk;

    // Setup Detail
    const $setupType = el('ai-setup-type');
    if ($setupType) {
      const setupLabel = signalSetupLabel(analysis.signal);
      $setupType.textContent = setupLabel === 'Market Neutral' ? setupLabel : `${setupLabel} Setup`;
      $setupType.style.color = analysis.signal === 'UPWARD BIAS' ? 'var(--emerald)' : analysis.signal === 'DOWNWARD BIAS' ? 'var(--red)' : 'var(--text-primary)';
    }

    const $reasoning = el('ai-reasoning');
    if ($reasoning) $reasoning.textContent = analysis.reasoning;

    // Levels
    el('ai-entry-price').textContent = analysis.entry > 0 ? fmt.usd(analysis.entry) : '-';
    el('ai-sl-price').textContent    = analysis.stopLoss > 0 ? fmt.usd(analysis.stopLoss) : '-';
    el('ai-tp-price').textContent    = analysis.takeProfit > 0 ? fmt.usd(analysis.takeProfit) : '-';

    // Factors
    const $factors = el('ai-factors');
    if ($factors) {
      $factors.innerHTML = analysis.factors.map(f => `
        <div class="factor-tag ${f.ok ? 'ok' : ''}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${f.name}: ${f.value}
        </div>
      `).join('');
    }

    const $freshness = el('ai-freshness');
    if ($freshness) {
      $freshness.textContent = `Intelligence Sync: ${fmt.timeShort(new Date())}`;
    }

    // Trigger chart overlay update
    if ($canvas && $canvas._chartMeta) {
        $canvas._chartMeta.activeSetup = analysis;
        drawChart($canvas, history, analysis.chg24 >= 0 ? 'up' : 'down');
    }
  }

  /* ================================================================
     MARKET REGIME BANNER
     ================================================================ */
  function updateRegimeBanner(analysisMap) {
    const el_val = el('regime-value');
    const el_reason = el('regime-reason');
    const el_dot = el('freshness-dot');
    const el_age = el('freshness-age');
    if (!el_val) return;

    const signals = Object.values(analysisMap).filter(Boolean);
    if (!signals.length) return;

    const buys = signals.filter(s => s.signal === 'UPWARD BIAS').length;
    const sells = signals.filter(s => s.signal === 'DOWNWARD BIAS').length;
    
    let label = 'Sideways', cls = 'neutral', reason = 'Mixed market signals';
    if (buys >= 2) { label = 'Bullish Trend'; cls = 'bullish'; reason = 'Broad momentum forming'; }
    if (sells >= 2) { label = 'Bearish Bias'; cls = 'bearish'; reason = 'Selling pressure increasing'; }

    el_val.textContent = label;
    el_val.className = `regime-value ${cls}`;
    if (el_reason) el_reason.textContent = reason;
    if (el_dot) el_dot.className = `freshness-dot live`;
    if (el_age && lastDataTs) {
      el_age.textContent = fmt.age(Date.now() - lastDataTs);
    }
  }

  /* ================================================================
     MARKET CARDS
     ================================================================ */
  function renderMarketCards(coinData, analysis) {
    if (!$marketCards) return;
    const html = COINS.map((coin) => {
      const d = coinData[coin.id];
      const a = analysis[coin.id];
      if (!d) return '';

      const price    = wsLivePrices[coin.symbol] || d.usd || 0;
      const change   = d.usd_24h_change || 0;
      const vol      = d.usd_24h_vol || 0;
      const chgCls   = change > 0 ? 'change-up' : change < 0 ? 'change-down' : 'change-flat';
      const arrow    = change > 0 ? '^' : change < 0 ? 'v' : '-';
      const sigLabel = a ? signalTagLabel(a.signal) : '-';
      const sigClass = a ? (a.signal === 'UPWARD BIAS' ? 'signal-upward' : a.signal === 'DOWNWARD BIAS' ? 'signal-downward' : 'signal-watch') : 'signal-neutral';

      return `<div class="market-card" role="group" aria-label="${coin.name} price and signal" data-coin="${coin.id}">
        <div class="market-card-header">
          <div>
            <div class="market-card-sym">${coin.symbol}</div>
            <div class="market-card-name">${coin.name}</div>
          </div>
          <div class="market-card-signal ${sigClass}">${sigLabel}</div>
        </div>
        <div class="market-card-price" data-live="${coin.symbol}">${fmt.usd(price)}</div>
        <div class="market-card-row">
          <span class="market-card-change ${chgCls}">${arrow} ${Math.abs(change).toFixed(2)}%</span>
          <span class="market-card-vol">${fmt.vol(vol)}</span>
        </div>
      </div>`;
    }).join('');
    $marketCards.innerHTML = html;
  }

  /* ================================================================
     TOP MOVERS SECTION
     ================================================================ */
  function renderTopMovers(coinData) {
    const $wrap = el('top-movers');
    if (!$wrap) return;
    const sorted = COINS
      .map(c => ({ ...c, change: coinData[c.id]?.usd_24h_change || 0 }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 3);

    $wrap.innerHTML = sorted.map((c, i) => {
      const cls = c.change >= 0 ? 'up' : 'down';
      return `<div class="mover-card">
        <div class="mover-rank">${i + 1}</div>
        <div>
          <div class="mover-sym">${c.symbol}</div>
          <div class="mover-name">${c.name}</div>
        </div>
        <div class="mover-pct ${cls}">${fmt.pct(c.change)}</div>
      </div>`;
    }).join('');
  }

  /* ================================================================
     TICKER STRIP
     ================================================================ */
  function renderTicker(coinData) {
    if (!$tickerInner) return;
    const items = COINS.map((coin) => {
      const d = coinData[coin.id];
      if (!d) return '';
      const price  = wsLivePrices[coin.symbol] || d.usd || 0;
      const change = d.usd_24h_change || 0;
      const cls    = change >= 0 ? 'ticker-up' : 'ticker-down';
      const arrow  = change >= 0 ? '^' : 'v';
      return `<span class="ticker-item">
        <span class="ticker-symbol">${coin.symbol}</span>
        <span class="ticker-price" data-ticker="${coin.symbol}">${fmt.usd(price)}</span>
        <span class="${cls}">${arrow} ${Math.abs(change).toFixed(2)}%</span>
      </span>`;
    }).join('');
    const group = `<span style="display:inline-flex;gap:0;padding-right:0">${items}</span>`;
    $tickerInner.innerHTML = group + group;
  }

  /* [DEPRECATED] signal-card implementation replaced by v4.0 AI Dashboard */

  /* ================================================================
     CANVAS CHART - Chart Rendering
     ================================================================ */
  function drawChart(canvas, prices, changeDir) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (!prices || prices.length < 2) {
      ctx.fillStyle = 'rgba(148,163,184,0.2)';
      ctx.font = '12px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Loading chart data-', W / 2, H / 2);
      return;
    }

    const vals   = prices.map(p => p[1]);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const range  = maxVal - minVal || 1;

    const PAD_L = 64, PAD_R = 16, PAD_T = 18, PAD_B = 28;
    const cW = W - PAD_L - PAD_R;
    const cH = H - PAD_T - PAD_B;

    const toX = (i) => PAD_L + (i / (prices.length - 1)) * cW;
    const toY = (v) => PAD_T + cH - ((v - minVal) / range) * cH;

    // Grid
    const gridCount = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridCount; i++) {
      const y = PAD_T + (cH / gridCount) * i;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
      const v = maxVal - (range / gridCount) * i;
      ctx.fillStyle = 'rgba(148,163,184,0.35)';
      ctx.font = '9px "Space Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(fmt.usdShort(v), PAD_L - 6, y + 3.5);
    }

    const isUp    = changeDir === 'up';
    const lineCol = isUp ? '#10b981' : '#ef4444';
    const gradTop = isUp ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.25)';
    const gradBot = isUp ? 'rgba(16,185,129,0.01)' : 'rgba(239,68,68,0.01)';

    // Area gradient
    const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + cH);
    grad.addColorStop(0, gradTop);
    grad.addColorStop(1, gradBot);

    // Bezier path
    function buildPath() {
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(vals[0]));
      for (let i = 1; i < vals.length; i++) {
        const x0 = toX(i - 1), y0 = toY(vals[i - 1]);
        const x1 = toX(i),     y1 = toY(vals[i]);
        const cpx = (x0 + x1) / 2;
        ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
      }
    }

    // Fill
    buildPath();
    ctx.lineTo(toX(vals.length - 1), PAD_T + cH);
    ctx.lineTo(PAD_L, PAD_T + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    buildPath();
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();

    // Endpoint pulse dot
    const lx = toX(vals.length - 1);
    const ly = toY(vals[vals.length - 1]);
    ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = lineCol; ctx.fill();
    ctx.strokeStyle = '#0a0b0f'; ctx.lineWidth = 2.5; ctx.stroke();

    // X labels
    const lblCount = Math.min(5, prices.length);
    const step = Math.floor((prices.length - 1) / (lblCount - 1));
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.font = '9px "Space Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < lblCount; i++) {
      const idx = Math.min(i * step, prices.length - 1);
      const lbl = fmt.timeShort(new Date(prices[idx][0]));
      ctx.fillText(lbl, toX(idx), PAD_T + cH + 18);
    }

    // SETUP OVERLAYS (AI INTEL)
    if (canvas._chartMeta && canvas._chartMeta.activeSetup) {
      const s = canvas._chartMeta.activeSetup;
      if (s.signal === 'UPWARD BIAS' || s.signal === 'DOWNWARD BIAS') {
        const drawLevel = (price, label, col) => {
          const y = toY(price);
          if (y < PAD_T || y > PAD_T + cH) return; // Out of bounds

          ctx.setLineDash([5, 3]);
          ctx.strokeStyle = col;
          ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = col;
          ctx.font = 'bold 9px "Space Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(label, PAD_L + 4, y - 4);
          
          ctx.textAlign = 'right';
          ctx.fillText(fmt.usdShort(price), W - PAD_R - 4, y - 4);
        };

        if (s.entry) drawLevel(s.entry, 'REFERENCE ZONE', 'rgba(255,255,255,0.4)');
        if (s.stopLoss) drawLevel(s.stopLoss, 'INVALIDATION', 'rgba(239,68,68,0.7)');
        if (s.takeProfit) drawLevel(s.takeProfit, 'TARGET ZONE', 'rgba(16,185,129,0.7)');
      }
    }

    // Store render meta for crosshair
    canvas._chartMeta = { ...canvas._chartMeta, vals, prices, PAD_L, PAD_R, PAD_T, PAD_B, cW, cH, toX, toY, lineCol };
  }

  function setupChartCrosshair() {
    if (!$canvas) return;
    const wrap = $canvas.parentElement || document.body;

    // Remove old tooltip/crosshair if present
    qsa('.chart-tooltip, .chart-crosshair-v, .chart-crosshair-h', wrap).forEach(e => e.remove());

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    const cvh = document.createElement('div');
    cvh.className = 'chart-crosshair-v';
    const chh = document.createElement('div');
    chh.className = 'chart-crosshair-h';

    wrap.style.position = 'relative';
    wrap.appendChild(tooltip);
    wrap.appendChild(cvh);
    wrap.appendChild(chh);

    $canvas.addEventListener('mousemove', (e) => {
      const meta = $canvas._chartMeta;
      if (!meta) return;
      const { prices, PAD_L, PAD_R, cW, toX, toY, vals, lineCol } = meta;

      const rect = $canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (mx < PAD_L || mx > rect.width - PAD_R) {
        tooltip.style.display = 'none';
        cvh.style.display = 'none'; chh.style.display = 'none';
        return;
      }

      const frac = (mx - PAD_L) / cW;
      let idx = Math.round(frac * (prices.length - 1));
      idx = Math.max(0, Math.min(idx, prices.length - 1));

      const [ts, price] = prices[idx];
      const py = toY(price);

      tooltip.innerHTML = `<div class="chart-tooltip-price">${fmt.usd(price)}</div>
        <div class="chart-tooltip-time">${new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${fmt.timeShort(new Date(ts))}</div>`;
      tooltip.style.display = 'block';

      // Position tooltip
      let tx = mx + 14;
      if (tx + 130 > rect.width) tx = mx - 140;
      tooltip.style.left  = tx + 'px';
      tooltip.style.top   = Math.max(10, py - 30) + 'px';

      // Crosshair
      cvh.style.display = 'block';
      cvh.style.left   = mx + 'px';
      cvh.style.top    = meta.PAD_T + 'px';
      cvh.style.height = meta.cH + 'px';

      chh.style.display = 'block';
      chh.style.top  = py + 'px';
      chh.style.left = meta.PAD_L + 'px';
      const cRight = rect.width - meta.PAD_R;
      chh.style.width = (cRight - meta.PAD_L) + 'px';
    });

    $canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
      cvh.style.display = 'none';
      chh.style.display = 'none';
    });
  }

  /* ================================================================
     CHART DATA + UPDATE
     ================================================================ */
  async function fetchChartData(coinId, tf) {
    let days = '1', interval = '';
    if (tf === '1W')  { days = '7'; interval = '&interval=hourly'; }
    if (tf === '1M')  { days = '30'; interval = '&interval=daily'; }
    if (tf === '1Y')  { days = '365'; interval = '&interval=daily'; }
    // 1D and LIVE -> days=1 (5-minute interval automatically)

    const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}${interval}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`CoinGecko chart: HTUpper ${res.status}`);
    return res.json();
  }

  async function updateChart(symbol, tf) {
    if (!symbol) symbol = currentChart;
    if (!tf) tf = currentTimeframe;

    currentChart = symbol;
    currentTimeframe = tf;

    const coinId = CHART_COINS[symbol];
    if (!coinId) return;

    // Update UI controls
    qsa('.asset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.symbol === symbol);
      b.setAttribute('aria-pressed', b.dataset.symbol === symbol ? 'true' : 'false');
    });
    qsa('.tf-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tf === tf);
      b.setAttribute('aria-pressed', b.dataset.tf === tf ? 'true' : 'false');
    });

    if ($chartLabel) $chartLabel.textContent = `${symbol}/USD`;

    const tfLabels = { 'LIVE':'Live Session', '1D':'24h', '1W':'7 Days', '1M':'30 Days', '1Y':'1 Year' };
    const badgeEl = el('chart-timeframe-label');
    if (badgeEl) badgeEl.textContent = tfLabels[tf] || tf;

    // Show current WS or cached price
    const livePrice = wsLivePrices[symbol];
    const cachedCoin = priceCache[coinId];
    const displayPrice = livePrice || (cachedCoin ? cachedCoin.usd : 0);
    if ($chartPrice && displayPrice) $chartPrice.textContent = fmt.usd(displayPrice);

    if (cachedCoin) {
      const chg = cachedCoin.usd_24h_change || 0;
      const cls = chg >= 0 ? 'up' : 'down';
      if ($chartChange) {
        $chartChange.textContent = fmt.pct(chg);
        $chartChange.className = `chart-change ${cls}`;
      }
    }

    if (!chartData[symbol]) chartData[symbol] = {};

    // Load or use cached chart data
    if (!chartData[symbol][tf]) {
      try {
        const raw = await fetchChartData(coinId, tf);
        let prices = raw.prices || [];
        if (tf === 'LIVE') prices = prices.slice(-72); // Last 6 hours approx zoom
        chartData[symbol][tf] = prices;
      } catch {
        chartData[symbol][tf] = null;
      }
    }

    const prices = chartData[symbol][tf];
    if (prices && prices.length > 0 && currentChart === symbol && currentTimeframe === tf) {
      const first = prices[0][1], last = prices[prices.length - 1][1];
      drawChart($canvas, prices, last >= first ? 'up' : 'down');
      if ($chartUpdated) $chartUpdated.textContent = `Updated: ${fmt.time(new Date())}`;

      // Render AI Information for this coin
      renderAIDashboard(symbol, priceCache, prices);
    }
  }

  /* ================================================================
     BINANCE WEBSOCKET (real-time price streaming)
     ================================================================ */
  function connectWebSocket() {
    if (wsConn) {
      try { wsConn.close(); } catch {}
    }

    const streams = COINS.filter(c => c.binance)
      .map(c => `${c.binance}@miniTicker`)
      .join('/');
    const url = `${BINANCE_WS_BASE}${streams}`;

    try {
      wsConn = new WebSocket(url);
    } catch {
      scheduleWsReconnect();
      return;
    }

    wsConn.onopen = () => {
      wsReconnects = 0;
      setLiveStatus('live', 'Live - WebSocket');
      startWsHeartbeat();
    };

    wsConn.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const data = msg.data || msg;
        if (!data || !data.s) return;

        const symbol = data.s.replace('USDT', '');
        const price  = parseFloat(data.c); // close price
        if (!isFinite(price)) return;

        wsLivePrices[symbol] = price;

        // Update live DOM elements
        const $liveEl = qs(`[data-live="${symbol}"]`);
        if ($liveEl) $liveEl.textContent = fmt.usd(price);

        const $tickerEl = qs(`[data-ticker="${symbol}"]`);
        if ($tickerEl) $tickerEl.textContent = fmt.usd(price);

        // Update chart price header if this is current chart
        if (symbol === currentChart) {
          if ($chartPrice) $chartPrice.textContent = fmt.usd(price);
          
          // Append to live chart seamlessly if in LIVE mode
          if (currentTimeframe === 'LIVE' && chartData[symbol] && chartData[symbol]['LIVE']) {
             const arr = chartData[symbol]['LIVE'];
             if (arr.length > 0) {
                const lastTs = arr[arr.length - 1][0];
                const now = Date.now();
                if (now - lastTs > 15000) { // push new node every 15s
                   arr.push([now, price]);
                   if (arr.length > 100) arr.shift();
                } else {
                   arr[arr.length - 1][1] = price; // overwrite last node live
                }
                // Schedule render
                requestAnimationFrame(() => {
                  if (currentChart === symbol && currentTimeframe === 'LIVE') {
                    const first = arr[0][1], last = arr[arr.length-1][1];
                    drawChart($canvas, arr, last >= first ? 'up' : 'down');
                  }
                });
             }
          }
        }
      } catch {}
    };

    wsConn.onerror = () => {
      setLiveStatus('error', 'Stream error');
    };

    wsConn.onclose = () => {
      stopWsHeartbeat();
      setLiveStatus('error', 'Reconnecting-');
      scheduleWsReconnect();
    };
  }

  function scheduleWsReconnect() {
    const delay = Math.min(2000 * Math.pow(2, wsReconnects), 30000);
    wsReconnects++;
    setTimeout(connectWebSocket, delay);
  }

  function startWsHeartbeat() {
    stopWsHeartbeat();
    wsHeartbeat = setInterval(() => {
      if (wsConn && wsConn.readyState === WebSocket.OPEN) {
        wsConn.send(JSON.stringify({ method: 'ping' }));
      }
    }, 20000);
  }

  function stopWsHeartbeat() {
    if (wsHeartbeat) { clearInterval(wsHeartbeat); wsHeartbeat = null; }
  }

  /* ================================================================
     COINGECKO REST POLL (60s)
     Fills in 24h change, volume, and historical chart data
     ================================================================ */
  async function fetchMarketData() {
    const ids = COINS.map(c => c.id).join(',');
    const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`CoinGecko: HTUpper ${res.status}`);
    return res.json();
  }

  async function refreshMarketData() {
    try {
      const data = await fetchMarketData();
      priceCache  = data;
      lastDataTs  = Date.now();

      // Market-wide fallback analysis for cards
      const analysisLegacy = analyzeMarketLegacy(data);
      renderMarketCards(data, analysisLegacy);
      renderTicker(data);
      renderTopMovers(data);
      updateRegimeBanner(analysisLegacy);

      // Update chart price from WS or REST
      const coinId = CHART_COINS[currentChart];
      if (coinId && data[coinId]) {
        const p   = data[coinId];
        const lp  = wsLivePrices[currentChart] || p.usd;
        if ($chartPrice) $chartPrice.textContent = fmt.usd(lp);
        const chg = p.usd_24h_change || 0;
        if ($chartChange) {
          $chartChange.textContent = fmt.pct(chg);
          $chartChange.className  = `chart-change ${chg >= 0 ? 'up' : 'down'}`;
        }
        // If we have history, update AI Dashboard
        if (chartData[currentChart] && chartData[currentChart][currentTimeframe]) {
           renderAIDashboard(currentChart, data, chartData[currentChart][currentTimeframe]);
        }
      }

      // If WS not connected, use REST as live status source
      if (!wsConn || wsConn.readyState !== WebSocket.OPEN) {
        setLiveStatus('live', 'Live - 60s refresh');
      }
    } catch (err) {
      console.warn('[HELIX] Market data fetch failed:', err.message);
      
      const isLocalFile = window.location.protocol === 'file:';
      const errorMsg = isLocalFile 
        ? 'Local File Restriction: Browser security (CORS) blocks live data fetches from file://. Please use a local web server or host the site to enable the scanner.' 
        : 'Unable to load market data. Please check your connection or try again.';
      
      setLiveStatus('error', isLocalFile ? 'Local Restricted' : 'Data Unavailable');

      if ($marketCards) {
        $marketCards.innerHTML = `
          <div class="market-card" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; border: 1px dashed var(--border-strong); background: rgba(0,0,0,0.15); border-radius: var(--r-lg)">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.6">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h4 style="margin: 0 0 0.5rem; font-size: 1rem; color: var(--text-primary)">Scanner Offline</h4>
            <p style="margin: 0 auto 1.5rem; font-size: 0.85rem; color: var(--text-secondary); max-width: 48ch; line-height: 1.6">${errorMsg}</p>
            ${isLocalFile ? '<a href="./DEPLOYMENT_GUIDE.md" style="color: var(--emerald); font-size: 0.8rem; font-weight: 600; text-decoration: none; border: 1px solid var(--border-accent); padding: 0.4rem 1rem; border-radius: 6px">Read Deployment Guide</a>' : '<button onclick="location.reload()" style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border); padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem">Retry Connection</button>'}
          </div>
        `;
      }
    }
  }

  /* ================================================================
     CHART BUTTON SETUP
     ================================================================ */
  function setupChartButtons() {
    qsa('.asset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.symbol === currentChart) return;
        updateChart(btn.dataset.symbol, currentTimeframe);
      });
    });
    qsa('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tf === currentTimeframe) return;
        updateChart(currentChart, btn.dataset.tf);
      });
    });
  }

  /* ================================================================
     CINEMATIC LOADER
     ================================================================ */
  function hideLoader() {
    const $loader = el('cinematic-loader');
    if (!$loader) return;
    $loader.classList.add('fade-out');
    setTimeout(() => { if ($loader.parentNode) $loader.parentNode.removeChild($loader); }, 1200);
  }

  /* ================================================================
     MOBILE NAV
     ================================================================ */
  function setupMobileNav() {
    const toggle = el('nav-toggle'), navLinks = el('nav-links');
    if (!toggle || !navLinks) return;
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('open', !open);
    });
    qsa('a', navLinks).forEach(a => a.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
    }));
    document.addEventListener('click', e => {
      if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
        toggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('open');
      }
    });
  }

  /* ================================================================
     STICKY NAV SCROLL
     ================================================================ */
  function setupStickyNav() {
    const nav = qs('.top-nav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    });
  }

  /* ================================================================
     MISC SETUP
     ================================================================ */
  function setFooterYear() {
    const yr = el('footer-year');
    if (yr) yr.textContent = new Date().getFullYear();
  }
  function setHeroDate() {
    const d = el('hero-updated-date');
    if (d) d.textContent = `Updated: ${new Date().toLocaleDateString('en-CA')}`;
  }

  /* ================================================================
     ONLINE / OFFLINE HANDLING
     ================================================================ */
  window.addEventListener('online',  () => { isOnline = true;  connectWebSocket(); refreshMarketData(); });
  window.addEventListener('offline', () => { isOnline = false; setLiveStatus('error', 'Offline'); });

  /* ================================================================
     RESIZE HANDLER
     ================================================================ */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const prices = chartData[currentChart] && chartData[currentChart][currentTimeframe];
      if (prices && $canvas) {
        const first = prices[0]?.[1] || 0, last = prices[prices.length - 1]?.[1] || 0;
        drawChart($canvas, prices, last >= first ? 'up' : 'down');
      }
    }, 120);
  });

  /* ================================================================
     INIT
     ================================================================ */
  function init() {
    $marketCards  = el('market-cards');
    $tickerInner  = el('ticker-inner');
    $liveBadge    = el('live-status-badge');
    $liveText     = el('live-status-text');
    $canvas       = el('priceChart');
    $chartPrice   = el('chart-price');
    $chartChange  = el('chart-change');
    $chartUpdated = el('chart-last-updated');
    $chartLabel   = el('chart-symbol-label');

    setFooterYear();
    setHeroDate();
    setupChartButtons();
    setupMobileNav();
    setupStickyNav();
    setupChartCrosshair();

    // Cinematic loader - hide after data is ready (max 2.5s)
    const loaderTimeout = setTimeout(hideLoader, 2500);

    // Boot: connect WS + fetch REST in parallel
    connectWebSocket();
    refreshMarketData().then(() => {
      clearTimeout(loaderTimeout);
      hideLoader();
      updateChart('BTC');
    }).catch(() => {
      clearTimeout(loaderTimeout);
      hideLoader();
    });

    // REST polling interval (maintains 24h stats + volume)
    setInterval(() => {
      refreshMarketData();
      // Expire cached REST data to get fresh on next fetch
      if (chartData[currentChart]) chartData[currentChart][currentTimeframe] = null;
      updateChart(currentChart, currentTimeframe);
    }, COINGECKO_REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();








