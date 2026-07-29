const axios = require('axios');

/**
 * Fetch stock price using Yahoo Finance API with candidate symbol resolution
 * Handles Indian stocks (NSE .NS, BSE .BO / .BSE) and US/Global stocks.
 * 
 * @param {string} symbol - Ticker symbol (e.g. ADANIGREEN.BSE, RELIANCE.NS, AAPL, TCS)
 * @returns {Promise<{price: number, change: number, changePercent: number, symbol: string, originalSymbol: string, currency: string, exchange: string, lastUpdated: Date}|null>}
 */
const fetchStockPrice = async (symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }

  const raw = symbol.trim().toUpperCase();
  if (!raw) return null;

  // Build ordered list of candidate tickers for Yahoo Finance
  const candidates = [];
  if (raw.endsWith('.BSE')) {
    const base = raw.replace(/\.BSE$/, '');
    candidates.push(base + '.BO', base + '.NS', raw);
  } else if (raw.endsWith('.BO') || raw.endsWith('.NS')) {
    const base = raw.slice(0, -3);
    const altSuffix = raw.endsWith('.NS') ? '.BO' : '.NS';
    candidates.push(raw, base + altSuffix, base);
  } else {
    // No extension provided: Try NSE (.NS), BSE (.BO), then US/Global raw
    candidates.push(raw + '.NS', raw + '.BO', raw);
  }

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

  // 1. Try Yahoo Finance v8 Chart API for each candidate ticker
  for (const candidate of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1d&range=1d`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: 8000
      });

      const result = response.data?.chart?.result?.[0];
      const meta = result?.meta;

      if (meta && (typeof meta.regularMarketPrice === 'number' || typeof meta.chartPreviousClose === 'number' || typeof meta.previousClose === 'number')) {
        const price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? meta.previousClose;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

        console.log(`[stockPriceService] Successfully fetched price for '${symbol}' via candidate '${candidate}': ₹${price}`);

        return {
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          symbol: candidate,
          originalSymbol: symbol,
          currency: meta.currency || (candidate.endsWith('.NS') || candidate.endsWith('.BO') ? 'INR' : 'USD'),
          exchange: meta.exchangeName || '',
          lastUpdated: new Date()
        };
      }
    } catch (err) {
      // Ignore individual candidate failures and try next candidate
    }
  }

  // 2. Backup: Yahoo Finance v10 Quote Summary API
  for (const candidate of candidates) {
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(candidate)}?modules=price`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': userAgent },
        timeout: 8000
      });

      const priceObj = response.data?.quoteSummary?.result?.[0]?.price;
      if (priceObj && typeof priceObj.regularMarketPrice?.raw === 'number') {
        const price = priceObj.regularMarketPrice.raw;
        const change = priceObj.regularMarketChange?.raw || 0;
        const changePercent = (priceObj.regularMarketChangePercent?.raw || 0) * 100;

        console.log(`[stockPriceService] Successfully fetched price via quoteSummary for '${candidate}': ₹${price}`);

        return {
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          symbol: candidate,
          originalSymbol: symbol,
          currency: priceObj.currency || 'INR',
          lastUpdated: new Date()
        };
      }
    } catch (err) {
      // Continue
    }
  }

  // 3. Fallback: Alpha Vantage API if user has process.env.ALPHA_VANTAGE_API_KEY
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (apiKey) {
    try {
      const avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(raw)}&apikey=${apiKey}`;
      const response = await axios.get(avUrl, { timeout: 8000 });
      const quote = response.data?.['Global Quote'];
      if (quote && quote['05. price']) {
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change'] || 0);
        const changePercent = parseFloat((quote['10. change percent'] || '').replace('%', '') || 0);
        return {
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          symbol: raw,
          originalSymbol: symbol,
          currency: 'USD',
          lastUpdated: new Date()
        };
      }
    } catch (avErr) {
      console.warn('[stockPriceService] Alpha Vantage fallback failed:', avErr.message);
    }
  }

  console.error(`[stockPriceService] Failed to fetch stock price for symbol: '${symbol}' (tested candidates: ${candidates.join(', ')})`);
  return null;
};

// Legacy exports for backwards compatibility
const getStockPrice = async (symbol) => fetchStockPrice(symbol);
const getIndianStockPrice = async (symbol) => fetchStockPrice(symbol);

module.exports = {
  fetchStockPrice,
  getStockPrice,
  getIndianStockPrice
};
