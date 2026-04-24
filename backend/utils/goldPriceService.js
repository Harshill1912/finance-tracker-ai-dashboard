const axios = require('axios');

// Get Gold price (Indian market - 24k gold per 10 grams)
const getGoldPrice = async () => {
  try {
    // Option 1: Try GoldAPI.io (requires API key but most reliable)
    if (process.env.GOLD_API_KEY) {
      try {
        const response = await axios.get(
          'https://api.goldapi.io/api/xau/INR',
          { 
            timeout: 8000,
            headers: {
              'x-access-token': process.env.GOLD_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data?.price) {
          // Price is per ounce, convert to per 10 grams
          // 1 ounce = 31.1035 grams
          const pricePer10Grams = (response.data.price / 31.1035) * 10;
          console.log('✅ Gold price from GoldAPI.io:', pricePer10Grams);
          return {
            price: Math.round(pricePer10Grams),
            currency: 'INR',
            unit: '10 grams',
            source: 'GoldAPI.io',
            lastUpdated: new Date()
          };
        }
      } catch (apiError) {
        console.log('⚠️ GoldAPI.io failed:', apiError.message);
      }
    }
    
    // Option 2: Try Metals.live API (free, USD price, convert to INR)
    try {
      const response = await axios.get(
        'https://api.metals.live/v1/spot/gold',
        { 
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (response.data?.price) {
        // Get current USD to INR exchange rate
        let usdToInr = 83; // Default fallback
        try {
          const fxResponse = await axios.get(
            'https://api.exchangerate-api.com/v4/latest/USD',
            { timeout: 5000 }
          );
          if (fxResponse.data?.rates?.INR) {
            usdToInr = fxResponse.data.rates.INR;
          }
        } catch (fxError) {
          console.log('⚠️ Exchange rate API failed, using default 83');
        }
        
        // Convert USD to INR
        const usdPrice = response.data.price;
        const inrPrice = usdPrice * usdToInr;
        
        // Convert ounce to 10 grams (1 ounce = 31.1035 grams)
        const pricePer10Grams = (inrPrice / 31.1035) * 10;
        
        console.log('✅ Gold price from Metals.live:', pricePer10Grams);
        return {
          price: Math.round(pricePer10Grams),
          currency: 'INR',
          unit: '10 grams',
          source: 'Metals.live',
          lastUpdated: new Date()
        };
      }
    } catch (metalsError) {
      console.log('⚠️ Metals.live API failed:', metalsError.message);
    }
    
    // Option 3: Try Alpha Vantage (if API key available)
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      try {
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=INR&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
          { timeout: 8000 }
        );
        
        if (response.data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']) {
          const pricePerOunce = parseFloat(response.data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
          const pricePer10Grams = (pricePerOunce / 31.1035) * 10;
          
          console.log('✅ Gold price from Alpha Vantage:', pricePer10Grams);
          return {
            price: Math.round(pricePer10Grams),
            currency: 'INR',
            unit: '10 grams',
            source: 'Alpha Vantage',
            lastUpdated: new Date()
          };
        }
      } catch (avError) {
        console.log('⚠️ Alpha Vantage failed:', avError.message);
      }
    }
    
    // Option 4: Try scraping from a reliable Indian gold price website (as last resort)
    try {
      // Using a simple API that provides Indian gold prices
      const response = await axios.get(
        'https://www.goldapi.io/api/XAU/INR',
        { 
          timeout: 5000,
          headers: {
            'x-access-token': process.env.GOLD_API_KEY || '',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data?.price) {
        const pricePerOunce = response.data.price;
        const pricePer10Grams = (pricePerOunce / 31.1035) * 10;
        
        console.log('✅ Gold price from alternative API:', pricePer10Grams);
        return {
          price: Math.round(pricePer10Grams),
          currency: 'INR',
          unit: '10 grams',
          source: 'Alternative API',
          lastUpdated: new Date()
        };
      }
    } catch (altError) {
      console.log('⚠️ Alternative API failed');
    }
    
    // Fallback: Use approximate current market price
    // 24k gold in India (as of 2024) is approximately ₹6,500-7,000 per gram
    // So per 10 grams: ₹65,000-70,000
    // Using a dynamic approximate based on recent trends
    const approximatePrice = 68000; // ₹6,800 per gram × 10 = ₹68,000 per 10g
    
    console.log('⚠️ Using approximate gold price (₹68,000 per 10g). Configure GOLD_API_KEY for real-time prices.');
    
    return {
      price: approximatePrice,
      currency: 'INR',
      unit: '10 grams',
      source: 'Approximate (Fallback)',
      lastUpdated: new Date(),
      note: 'Using approximate price. Set GOLD_API_KEY environment variable for real-time prices.'
    };
  } catch (error) {
    console.error('❌ Error fetching gold price:', error.message);
    // Return approximate price as final fallback
    return {
      price: 68000, // Approximate 24k gold price per 10 grams in India
      currency: 'INR',
      unit: '10 grams',
      source: 'Fallback',
      lastUpdated: new Date(),
      note: 'Using approximate price. All APIs unavailable.'
    };
  }
};

module.exports = {
  getGoldPrice
};
