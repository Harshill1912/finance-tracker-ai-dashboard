const axios = require('axios');

// Alpha Vantage API for stock prices
const getStockPrice = async (symbol) => {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || '872XM08JT8P7M8S1';
  
  if (!apiKey || !symbol) {
    return null;
  }

  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
      { timeout: 10000 }
    );

    const data = response.data;
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      return {
        price: parseFloat(data['Global Quote']['05. price']),
        change: parseFloat(data['Global Quote']['09. change'] || 0),
        changePercent: parseFloat(data['Global Quote']['10. change percent']?.replace('%', '') || 0),
        lastUpdated: new Date()
      };
    } else if (data['Error Message']) {
      console.error('Alpha Vantage API Error:', data['Error Message']);
      return null;
    } else if (data['Note']) {
      // API rate limit
      console.warn('Alpha Vantage API rate limit reached');
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching stock price:', error.message);
    return null;
  }
};

// Indian Stock Exchange (NSE/BSE) - Alternative using Yahoo Finance API
const getIndianStockPrice = async (symbol) => {
  try {
    // For Indian stocks, try Yahoo Finance API
    // Format: RELIANCE.NS for NSE, RELIANCE.BO for BSE
    const nseSymbol = `${symbol}.NS`;
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}`,
      { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (response.data?.chart?.result?.[0]?.meta) {
      const meta = response.data.chart.result[0].meta;
      return {
        price: meta.regularMarketPrice || meta.previousClose,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        lastUpdated: new Date(meta.regularMarketTime * 1000)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Indian stock price:', error.message);
    return null;
  }
};

// Get stock price (tries both APIs)
const fetchStockPrice = async (symbol) => {
  // First try Alpha Vantage (works for US stocks)
  let priceData = await getStockPrice(symbol);
  
  // If Alpha Vantage fails, try Indian stock API
  if (!priceData) {
    priceData = await getIndianStockPrice(symbol);
  }
  
  return priceData;
};

module.exports = {
  fetchStockPrice,
  getStockPrice,
  getIndianStockPrice
};
