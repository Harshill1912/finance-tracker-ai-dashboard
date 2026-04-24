const axios = require('axios');

// Get Mutual Fund NAV from MFAPI (Indian mutual funds)
const getMutualFundNAV = async (schemeName) => {
  try {
    // Search for the fund
    const searchResponse = await axios.get(
      `https://api.mfapi.in/mf/search?q=${encodeURIComponent(schemeName)}`,
      { timeout: 10000 }
    );

    if (!searchResponse.data || searchResponse.data.length === 0) {
      return null;
    }

    // Find exact match or use first result
    const match = searchResponse.data.find(
      item => item.schemeName.toLowerCase() === schemeName.toLowerCase()
    ) || searchResponse.data[0];

    const fundCode = match?.schemeCode;
    if (!fundCode) {
      return null;
    }

    // Get NAV data
    const navResponse = await axios.get(
      `https://api.mfapi.in/mf/${fundCode}`,
      { timeout: 10000 }
    );

    if (navResponse.data?.data && navResponse.data.data.length > 0) {
      const latestNav = navResponse.data.data[0];
      return {
        nav: parseFloat(latestNav.nav),
        date: latestNav.date,
        schemeCode: fundCode,
        schemeName: match.schemeName,
        lastUpdated: new Date()
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching mutual fund NAV:', error.message);
    return null;
  }
};

// Get ETF price (similar to stocks)
const getETFPrice = async (symbol) => {
  // ETFs can be fetched like stocks
  const stockPriceService = require('./stockPriceService');
  return await stockPriceService.fetchStockPrice(symbol);
};

module.exports = {
  getMutualFundNAV,
  getETFPrice
};
