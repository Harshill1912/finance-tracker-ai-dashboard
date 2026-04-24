const express = require('express');
const router = express.Router();
const Investment = require('../models/investment');
const auth = require('../authMiddleare');
const { fetchStockPrice } = require('../utils/stockPriceService');
const { getMutualFundNAV, getETFPrice } = require('../utils/mutualFundService');
const { getGoldPrice } = require('../utils/goldPriceService');

// Get all investments for a user
router.get('/', auth, async (req, res) => {
  try {
    const investments = await Investment.find({ 
      userId: req.user.id,
      isActive: true 
    }).sort({ purchaseDate: -1 });

    res.json({ investments });
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ message: 'Failed to fetch investments' });
  }
});

// IMPORTANT: Specific routes must come before generic /:id route
// Update single investment price (must be before /:id route)
router.post('/:id/update-price', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const investment = await Investment.findOne({ 
      _id: req.params.id, 
      userId, 
      isActive: true 
    });

    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    let newCurrentValue = investment.currentValue || investment.amountInvested;
    let priceData = null;
    let updatedFields = {};

    switch (investment.type) {
      case 'stock':
        try {
          if (investment.symbol) {
            priceData = await fetchStockPrice(investment.symbol);
            if (priceData && priceData.price > 0) {
              const currentPrice = priceData.price;
              
              if (investment.quantity && parseFloat(investment.quantity) > 0) {
                // Calculate using shares held
                const shares = parseFloat(investment.quantity);
                newCurrentValue = currentPrice * shares;
                
                const amountInvested = investment.amountInvested || 0;
                const purchasePrice = investment.purchasePrice || currentPrice;
                const returns = newCurrentValue - amountInvested;
                const returnsPercentage = amountInvested > 0 ? (returns / amountInvested) * 100 : 0;
                const priceChange = ((currentPrice - purchasePrice) / purchasePrice) * 100;
                
                console.log(`✅ Stock price update:`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
                console.log(`   Purchase price: ₹${purchasePrice.toFixed(2)}`);
                console.log(`   Shares: ${shares}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Amount invested: ₹${amountInvested.toLocaleString('en-IN')}`);
                console.log(`   Returns: ₹${returns.toFixed(2)} (${returnsPercentage.toFixed(2)}%)`);
                console.log(`   Price change: ${priceChange.toFixed(2)}%`);
                if (priceData.change !== undefined) {
                  console.log(`   Day change: ₹${priceData.change.toFixed(2)} (${priceData.changePercent?.toFixed(2) || 0}%)`);
                }
              } else if (investment.amountInvested && investment.purchasePrice && investment.purchasePrice > 0) {
                // Calculate using purchase price
                const purchasePrice = parseFloat(investment.purchasePrice);
                const amountInvested = parseFloat(investment.amountInvested);
                const shares = amountInvested / purchasePrice;
                newCurrentValue = currentPrice * shares;
                
                const returns = newCurrentValue - amountInvested;
                const returnsPercentage = (returns / amountInvested) * 100;
                
                console.log(`✅ Stock price update (from purchase price):`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Purchase price: ₹${purchasePrice.toFixed(2)}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
                console.log(`   Shares: ${shares.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Returns: ₹${returns.toFixed(2)} (${returnsPercentage.toFixed(2)}%)`);
                
                // Auto-update quantity if missing
                if ((!investment.quantity || investment.quantity === 0) && shares > 0) {
                  updatedFields.quantity = Math.round(shares * 10000) / 10000; // Round to 4 decimals
                  console.log(`   📝 Will auto-update shares to ${updatedFields.quantity}`);
                }
              } else if (investment.amountInvested && investment.amountInvested > 0) {
                // Estimate shares from invested amount
                const amountInvested = parseFloat(investment.amountInvested);
                const estimatedShares = amountInvested / currentPrice;
                newCurrentValue = currentPrice * estimatedShares;
                
                console.log(`✅ Stock price update (estimated):`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
                console.log(`   Estimated shares: ${estimatedShares.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                
                // Auto-update quantity and purchase price
                if ((!investment.quantity || investment.quantity === 0) && estimatedShares > 0) {
                  updatedFields.quantity = Math.round(estimatedShares * 10000) / 10000;
                  updatedFields.purchasePrice = currentPrice;
                  console.log(`   📝 Will auto-update shares to ${updatedFields.quantity} and purchase price to ₹${currentPrice.toFixed(2)}`);
                }
              } else {
                // Just use current price
                newCurrentValue = currentPrice;
                console.log(`✅ Stock price update (price only):`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
              }
            } else {
              console.log(`⚠️ Invalid stock price data received:`, priceData);
            }
          } else {
            console.log(`⚠️ Stock investment missing symbol`);
          }
        } catch (error) {
          console.error(`❌ Error fetching stock price:`, error.message);
        }
        break;

      case 'etf':
        try {
          if (investment.symbol) {
            priceData = await getETFPrice(investment.symbol);
            if (priceData && priceData.price > 0) {
              const currentPrice = priceData.price;
              
              if (investment.quantity && parseFloat(investment.quantity) > 0) {
                // Calculate using units held
                const units = parseFloat(investment.quantity);
                newCurrentValue = currentPrice * units;
                
                const amountInvested = investment.amountInvested || 0;
                const purchasePrice = investment.purchasePrice || currentPrice;
                const returns = newCurrentValue - amountInvested;
                const returnsPercentage = amountInvested > 0 ? (returns / amountInvested) * 100 : 0;
                
                console.log(`✅ ETF price update:`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
                console.log(`   Units: ${units.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Returns: ₹${returns.toFixed(2)} (${returnsPercentage.toFixed(2)}%)`);
              } else if (investment.amountInvested && investment.purchasePrice && investment.purchasePrice > 0) {
                // Calculate using purchase price
                const purchasePrice = parseFloat(investment.purchasePrice);
                const amountInvested = parseFloat(investment.amountInvested);
                const units = amountInvested / purchasePrice;
                newCurrentValue = currentPrice * units;
                
                const returns = newCurrentValue - amountInvested;
                const returnsPercentage = (returns / amountInvested) * 100;
                
                console.log(`✅ ETF price update (from purchase price):`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Purchase price: ₹${purchasePrice.toFixed(2)}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
                console.log(`   Units: ${units.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Returns: ₹${returns.toFixed(2)} (${returnsPercentage.toFixed(2)}%)`);
                
                // Auto-update quantity if missing
                if ((!investment.quantity || investment.quantity === 0) && units > 0) {
                  updatedFields.quantity = Math.round(units * 10000) / 10000;
                  console.log(`   📝 Will auto-update units to ${updatedFields.quantity}`);
                }
              } else if (investment.amountInvested && investment.amountInvested > 0) {
                // Estimate units from invested amount
                const amountInvested = parseFloat(investment.amountInvested);
                const estimatedUnits = amountInvested / currentPrice;
                newCurrentValue = currentPrice * estimatedUnits;
                
                console.log(`✅ ETF price update (estimated):`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
                console.log(`   Estimated units: ${estimatedUnits.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                
                // Auto-update quantity and purchase price
                if ((!investment.quantity || investment.quantity === 0) && estimatedUnits > 0) {
                  updatedFields.quantity = Math.round(estimatedUnits * 10000) / 10000;
                  updatedFields.purchasePrice = currentPrice;
                  console.log(`   📝 Will auto-update units to ${updatedFields.quantity} and purchase price to ₹${currentPrice.toFixed(2)}`);
                }
              } else {
                newCurrentValue = currentPrice;
                console.log(`✅ ETF price update (price only):`);
                console.log(`   Symbol: ${investment.symbol}`);
                console.log(`   Current price: ₹${currentPrice.toFixed(2)}`);
              }
            } else {
              console.log(`⚠️ Invalid ETF price data received:`, priceData);
            }
          } else {
            console.log(`⚠️ ETF investment missing symbol`);
          }
        } catch (error) {
          console.error(`❌ Error fetching ETF price:`, error.message);
        }
        break;

      case 'mutual_fund':
        try {
          if (investment.name || investment.symbol) {
            const navData = await getMutualFundNAV(investment.name || investment.symbol);
            if (navData && navData.nav > 0) {
              const currentNAV = navData.nav;
              
              if (investment.quantity && parseFloat(investment.quantity) > 0) {
                // Calculate using units held
                const units = parseFloat(investment.quantity);
                newCurrentValue = currentNAV * units;
                
                const amountInvested = investment.amountInvested || 0;
                const returns = newCurrentValue - amountInvested;
                const returnsPercentage = amountInvested > 0 ? (returns / amountInvested) * 100 : 0;
                
                console.log(`✅ Mutual Fund NAV update:`);
                console.log(`   Fund: ${navData.schemeName || investment.name}`);
                console.log(`   Scheme Code: ${navData.schemeCode || 'N/A'}`);
                console.log(`   Current NAV: ₹${currentNAV.toFixed(4)}`);
                console.log(`   Units held: ${units.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Amount invested: ₹${amountInvested.toLocaleString('en-IN')}`);
                console.log(`   Returns: ₹${returns.toFixed(2)} (${returnsPercentage.toFixed(2)}%)`);
                console.log(`   NAV date: ${navData.date || 'N/A'}`);
              } else if (investment.amountInvested && investment.purchasePrice && investment.purchasePrice > 0) {
                // Calculate using purchase NAV and current NAV
                const purchaseNAV = parseFloat(investment.purchasePrice);
                const amountInvested = parseFloat(investment.amountInvested);
                const units = amountInvested / purchaseNAV;
                newCurrentValue = currentNAV * units;
                
                const returns = newCurrentValue - amountInvested;
                const returnsPercentage = (returns / amountInvested) * 100;
                
                console.log(`✅ Mutual Fund NAV update (from purchase NAV):`);
                console.log(`   Fund: ${navData.schemeName || investment.name}`);
                console.log(`   Purchase NAV: ₹${purchaseNAV.toFixed(4)}`);
                console.log(`   Current NAV: ₹${currentNAV.toFixed(4)}`);
                console.log(`   Units: ${units.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Returns: ₹${returns.toFixed(2)} (${returnsPercentage.toFixed(2)}%)`);
                
                // Auto-update quantity if missing
                if ((!investment.quantity || investment.quantity === 0) && units > 0) {
                  updatedFields.quantity = Math.round(units * 10000) / 10000; // Round to 4 decimals
                  console.log(`   📝 Will auto-update units to ${updatedFields.quantity}`);
                }
              } else if (investment.amountInvested && investment.amountInvested > 0) {
                // Estimate units from invested amount (assume purchased at current NAV)
                const amountInvested = parseFloat(investment.amountInvested);
                const estimatedUnits = amountInvested / currentNAV;
                newCurrentValue = currentNAV * estimatedUnits;
                
                console.log(`✅ Mutual Fund NAV update (estimated):`);
                console.log(`   Fund: ${navData.schemeName || investment.name}`);
                console.log(`   Current NAV: ₹${currentNAV.toFixed(4)}`);
                console.log(`   Estimated units: ${estimatedUnits.toFixed(4)}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Amount invested: ₹${amountInvested.toLocaleString('en-IN')}`);
                
                // Auto-update quantity
                if ((!investment.quantity || investment.quantity === 0) && estimatedUnits > 0) {
                  updatedFields.quantity = Math.round(estimatedUnits * 10000) / 10000;
                  updatedFields.purchasePrice = currentNAV; // Set purchase NAV
                  console.log(`   📝 Will auto-update units to ${updatedFields.quantity} and purchase NAV to ₹${currentNAV.toFixed(4)}`);
                }
              } else {
                console.log(`⚠️ Mutual Fund missing quantity, purchasePrice, or amountInvested`);
              }
            } else {
              console.log(`⚠️ Invalid NAV data received:`, navData);
            }
          } else {
            console.log(`⚠️ Could not fetch NAV for ${investment.name || investment.symbol}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching mutual fund NAV:`, error.message);
        }
        break;

      case 'gold':
        try {
          const goldData = await getGoldPrice();
          if (goldData && goldData.price && goldData.price > 0) {
            const pricePer10Grams = goldData.price;
            const pricePerGram = pricePer10Grams / 10;
            
            if (investment.quantity && parseFloat(investment.quantity) > 0) {
              // Quantity is in grams, calculate: price per gram × quantity
              const quantityInGrams = parseFloat(investment.quantity);
              newCurrentValue = pricePerGram * quantityInGrams;
              
              console.log(`✅ Gold price update:`);
              console.log(`   Source: ${goldData.source || 'API'}`);
              console.log(`   Price per 10g: ₹${pricePer10Grams.toLocaleString('en-IN')}`);
              console.log(`   Price per gram: ₹${pricePerGram.toFixed(2)}`);
              console.log(`   Quantity: ${quantityInGrams}g`);
              console.log(`   Calculated current value: ₹${newCurrentValue.toFixed(2)}`);
              console.log(`   Amount invested: ₹${investment.amountInvested?.toLocaleString('en-IN') || 'N/A'}`);
              
              // Update quantity if it wasn't set but we can estimate from amount invested
              if (!investment.quantity && investment.amountInvested) {
                const estimatedGrams = investment.amountInvested / pricePerGram;
                investment.quantity = estimatedGrams;
                console.log(`   📝 Estimated quantity: ${estimatedGrams.toFixed(2)}g`);
              }
            } else if (investment.amountInvested && investment.amountInvested > 0) {
              // Estimate quantity based on invested amount
              // Try to get purchase price if available, otherwise use current price
              let purchasePricePerGram = pricePerGram;
              if (investment.purchasePrice && investment.purchasePrice > 0) {
                purchasePricePerGram = investment.purchasePrice;
              }
              
              // Calculate estimated grams from invested amount
              const estimatedGrams = investment.amountInvested / purchasePricePerGram;
              
              // Current value = current price × estimated grams
              newCurrentValue = pricePerGram * estimatedGrams;
              
              console.log(`✅ Gold price update (estimated from amount):`);
              console.log(`   Source: ${goldData.source || 'API'}`);
              console.log(`   Current price per 10g: ₹${pricePer10Grams.toLocaleString('en-IN')}`);
              console.log(`   Current price per gram: ₹${pricePerGram.toFixed(2)}`);
              console.log(`   Purchase price per gram: ₹${purchasePricePerGram.toFixed(2)}`);
              console.log(`   Estimated grams: ${estimatedGrams.toFixed(2)}g`);
              console.log(`   Calculated current value: ₹${newCurrentValue.toFixed(2)}`);
              console.log(`   Amount invested: ₹${investment.amountInvested.toLocaleString('en-IN')}`);
              
              // Auto-update quantity if not set
              if ((!investment.quantity || investment.quantity === 0) && estimatedGrams > 0) {
                const roundedQuantity = Math.round(estimatedGrams * 100) / 100; // Round to 2 decimals
                updatedFields.quantity = roundedQuantity;
                console.log(`   📝 Will auto-update quantity to ${roundedQuantity}g`);
              }
            } else {
              console.log(`⚠️ Gold investment missing both quantity and amountInvested`);
              console.log(`   Using current value as: ₹${investment.currentValue || 0}`);
            }
          } else {
            console.log(`⚠️ Gold price data not available or invalid`);
            console.log(`   Price received:`, goldData);
          }
        } catch (error) {
          console.error(`❌ Error fetching gold price:`, error.message);
          console.error(`   Stack:`, error.stack);
        }
        
        // Store updated fields to apply after switch
        if (Object.keys(updatedFields).length > 0) {
          Object.assign(investment, updatedFields);
          console.log(`   📝 Will update quantity to ${updatedFields.quantity}g`);
        }
        break;

      case 'sip':
        try {
          if (investment.sipAmount && investment.purchaseDate) {
            const purchaseDate = new Date(investment.purchaseDate);
            const currentDate = new Date();
            const daysDiff = Math.floor((currentDate - purchaseDate) / (1000 * 60 * 60 * 24));
            
            // Determine number of installments based on frequency
            let installments = 0;
            let annualReturnRate = 0.12; // Default 12% annual return
            
            if (investment.sipFrequency === 'monthly') {
              installments = Math.floor(daysDiff / 30);
            } else if (investment.sipFrequency === 'quarterly') {
              installments = Math.floor(daysDiff / 90);
            } else if (investment.sipFrequency === 'half-yearly') {
              installments = Math.floor(daysDiff / 180);
            } else if (investment.sipFrequency === 'yearly') {
              installments = Math.floor(daysDiff / 365);
            } else {
              // Default to monthly
              installments = Math.floor(daysDiff / 30);
            }
            
            if (installments > 0) {
              // Use SIP future value formula: FV = P × [((1 + r)^n - 1) / r] × (1 + r)
              // Where P = periodic payment, r = periodic rate, n = number of periods
              
              let periodicRate = 0;
              if (investment.sipFrequency === 'monthly') {
                periodicRate = annualReturnRate / 12; // Monthly rate
              } else if (investment.sipFrequency === 'quarterly') {
                periodicRate = annualReturnRate / 4; // Quarterly rate
              } else if (investment.sipFrequency === 'half-yearly') {
                periodicRate = annualReturnRate / 2; // Half-yearly rate
              } else {
                periodicRate = annualReturnRate; // Yearly rate
              }
              
              // SIP Future Value Formula
              const sipAmount = parseFloat(investment.sipAmount);
              const futureValue = sipAmount * (((Math.pow(1 + periodicRate, installments) - 1) / periodicRate) * (1 + periodicRate));
              
              newCurrentValue = futureValue;
              
              const totalInvested = sipAmount * installments;
              const returns = futureValue - totalInvested;
              const returnsPercentage = (returns / totalInvested) * 100;
              
              console.log(`✅ SIP calculation:`);
              console.log(`   Frequency: ${investment.sipFrequency || 'monthly'}`);
              console.log(`   Installments: ${installments}`);
              console.log(`   Amount per installment: ₹${sipAmount.toLocaleString('en-IN')}`);
              console.log(`   Total invested: ₹${totalInvested.toLocaleString('en-IN')}`);
              console.log(`   Estimated current value: ₹${futureValue.toFixed(2)}`);
              console.log(`   Estimated returns: ₹${returns.toFixed(2)} (${returnsPercentage.toFixed(2)}%)`);
              console.log(`   Annual return rate: ${(annualReturnRate * 100).toFixed(1)}%`);
            } else {
              // If less than one installment period, just use invested amount
              newCurrentValue = investment.amountInvested || investment.sipAmount || 0;
              console.log(`⚠️ SIP: Less than one installment period completed`);
            }
          } else {
            console.log(`⚠️ SIP investment missing required fields (sipAmount or purchaseDate)`);
          }
        } catch (error) {
          console.error(`❌ Error calculating SIP value:`, error.message);
          // Fallback to invested amount
          newCurrentValue = investment.amountInvested || investment.sipAmount || 0;
        }
        break;

      case 'fd':
        try {
          if (investment.interestRate && investment.purchaseDate && investment.amountInvested) {
            const currentDate = new Date();
            const purchaseDate = new Date(investment.purchaseDate);
            const amountInvested = parseFloat(investment.amountInvested);
            const interestRate = parseFloat(investment.interestRate) / 100; // Convert to decimal
            
            // Calculate time elapsed
            const daysElapsed = Math.floor((currentDate - purchaseDate) / (1000 * 60 * 60 * 24));
            const yearsElapsed = daysElapsed / 365;
            const monthsElapsed = daysElapsed / 30;
            
            if (investment.maturityDate) {
              const maturityDate = new Date(investment.maturityDate);
              const totalDays = Math.floor((maturityDate - purchaseDate) / (1000 * 60 * 60 * 24));
              const totalYears = totalDays / 365;
              
              if (maturityDate > currentDate) {
                // FD is still active - calculate current value with compound interest
                // Most FDs compound quarterly, but we'll use daily compounding for accuracy
                const compoundingFrequency = 365; // Daily compounding
                const periods = daysElapsed;
                const ratePerPeriod = interestRate / compoundingFrequency;
                
                // Compound interest formula: A = P(1 + r/n)^(nt)
                newCurrentValue = amountInvested * Math.pow(1 + ratePerPeriod, periods);
                
                // For simplicity, also calculate with quarterly compounding (more common)
                const quarterlyValue = amountInvested * Math.pow(1 + interestRate / 4, Math.floor(monthsElapsed / 3) * 4);
                
                // Use the higher of the two (or quarterly if it's more realistic)
                newCurrentValue = quarterlyValue;
                
                const interestEarned = newCurrentValue - amountInvested;
                const interestPercentage = (interestEarned / amountInvested) * 100;
                
                console.log(`✅ FD calculation (Active):`);
                console.log(`   Principal: ₹${amountInvested.toLocaleString('en-IN')}`);
                console.log(`   Interest rate: ${(interestRate * 100).toFixed(2)}% p.a.`);
                console.log(`   Days elapsed: ${daysElapsed} (${yearsElapsed.toFixed(2)} years)`);
                console.log(`   Maturity date: ${maturityDate.toLocaleDateString()}`);
                console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Interest earned: ₹${interestEarned.toFixed(2)} (${interestPercentage.toFixed(2)}%)`);
              } else {
                // FD has matured - calculate final maturity value
                const compoundingFrequency = 4; // Quarterly compounding
                const totalPeriods = Math.floor(totalYears * compoundingFrequency);
                
                newCurrentValue = amountInvested * Math.pow(1 + interestRate / compoundingFrequency, totalPeriods);
                
                const totalInterest = newCurrentValue - amountInvested;
                const totalReturnPercentage = (totalInterest / amountInvested) * 100;
                
                console.log(`✅ FD calculation (Matured):`);
                console.log(`   Principal: ₹${amountInvested.toLocaleString('en-IN')}`);
                console.log(`   Interest rate: ${(interestRate * 100).toFixed(2)}% p.a.`);
                console.log(`   Tenure: ${totalYears.toFixed(2)} years`);
                console.log(`   Maturity value: ₹${newCurrentValue.toFixed(2)}`);
                console.log(`   Total interest: ₹${totalInterest.toFixed(2)} (${totalReturnPercentage.toFixed(2)}%)`);
              }
            } else {
              // No maturity date - calculate based on elapsed time
              const compoundingFrequency = 4; // Quarterly compounding
              const periods = Math.floor(monthsElapsed / 3) * 4;
              
              newCurrentValue = amountInvested * Math.pow(1 + interestRate / compoundingFrequency, periods);
              
              console.log(`✅ FD calculation (No maturity date):`);
              console.log(`   Principal: ₹${amountInvested.toLocaleString('en-IN')}`);
              console.log(`   Interest rate: ${(interestRate * 100).toFixed(2)}% p.a.`);
              console.log(`   Time elapsed: ${daysElapsed} days (${yearsElapsed.toFixed(2)} years)`);
              console.log(`   Current value: ₹${newCurrentValue.toFixed(2)}`);
            }
          } else {
            console.log(`⚠️ FD investment missing required fields (interestRate, purchaseDate, or amountInvested)`);
          }
        } catch (error) {
          console.error(`❌ Error calculating FD value:`, error.message);
          // Fallback to invested amount
          newCurrentValue = investment.amountInvested || 0;
        }
        break;
    }

    // Update current value and any other fields (like quantity for gold)
    if (newCurrentValue !== investment.currentValue || Object.keys(updatedFields).length > 0) {
      investment.currentValue = newCurrentValue;
      investment.lastUpdated = new Date();
      if (Object.keys(updatedFields).length > 0) {
        Object.assign(investment, updatedFields);
        console.log(`   📝 Updated fields:`, updatedFields);
      }
      await investment.save();
      
      console.log(`✅ Updated ${investment.type} price for ${investment.name}: ₹${newCurrentValue}`);
    }

    res.json({ 
      message: 'Investment price updated successfully', 
      investment 
    });
  } catch (error) {
    console.error('Error updating single investment price:', error);
    res.status(500).json({ message: 'Failed to update investment price', error: error.message });
  }
});

// Get single investment
router.get('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    res.json({ investment });
  } catch (error) {
    console.error('Error fetching investment:', error);
    res.status(500).json({ message: 'Failed to fetch investment' });
  }
});

// Create new investment
router.post('/', auth, async (req, res) => {
  try {
    const {
      type,
      name,
      symbol,
      amountInvested,
      currentValue,
      quantity,
      purchasePrice,
      purchaseDate,
      interestRate,
      maturityDate,
      sipAmount,
      sipFrequency,
      riskLevel,
      notes
    } = req.body;

    // Validation
    if (!type || !name || !amountInvested) {
      return res.status(400).json({ 
        message: 'Type, name, and amount invested are required' 
      });
    }

    // Always try to fetch accurate currentValue for stocks, mutual funds, ETFs, and gold
    // Only use provided currentValue if auto-fetch fails
    let finalCurrentValue = parseFloat(currentValue) || parseFloat(amountInvested) || 0;
    // Ensure it's a valid number
    if (isNaN(finalCurrentValue) || finalCurrentValue < 0) {
      finalCurrentValue = parseFloat(amountInvested) || 0;
    }
    
    // Auto-fetch price for stocks and ETFs
    if (type === 'stock' || type === 'etf') {
      if (symbol) {
        try {
          const priceData = await fetchStockPrice(symbol);
          if (priceData) {
            if (quantity) {
              // If quantity is provided, calculate: currentPrice × quantity
              finalCurrentValue = priceData.price * parseFloat(quantity);
            } else if (purchasePrice && amountInvested) {
              // If purchase price is provided, calculate based on price change
              const priceChange = priceData.price / parseFloat(purchasePrice);
              finalCurrentValue = parseFloat(amountInvested) * priceChange;
            } else if (amountInvested) {
              // Fallback: assume 1 unit, use current price
              finalCurrentValue = priceData.price;
            }
            console.log(`✅ Fetched ${type} price for ${symbol}: ₹${priceData.price}, calculated value: ₹${finalCurrentValue}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch ${type} price for ${symbol}, using provided/default value`);
        }
      }
    } 
    // Auto-fetch NAV for mutual funds
    else if (type === 'mutual_fund') {
      if (name || symbol) {
        try {
          const navData = await getMutualFundNAV(name || symbol);
          if (navData) {
            if (quantity) {
              // If quantity (units) is provided, calculate: NAV × quantity
              finalCurrentValue = navData.nav * parseFloat(quantity);
            } else if (purchasePrice && amountInvested) {
              // If purchase NAV is provided, calculate based on NAV change
              const navChange = navData.nav / parseFloat(purchasePrice);
              finalCurrentValue = parseFloat(amountInvested) * navChange;
            } else if (amountInvested) {
              // Estimate: assume invested amount can buy units at current NAV
              const estimatedUnits = parseFloat(amountInvested) / navData.nav;
              finalCurrentValue = navData.nav * estimatedUnits;
            }
            console.log(`✅ Fetched MF NAV for ${name || symbol}: ₹${navData.nav}, calculated value: ₹${finalCurrentValue}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch MF NAV for ${name || symbol}, using provided/default value`);
        }
      }
    } 
    // Auto-fetch price for gold
    else if (type === 'gold') {
      try {
        const goldData = await getGoldPrice();
        if (goldData && goldData.price && goldData.price > 0) {
          const pricePer10Grams = goldData.price;
          const pricePerGram = pricePer10Grams / 10;
          
          if (quantity && parseFloat(quantity) > 0) {
            // Quantity is in grams, calculate: price per gram × quantity
            const quantityInGrams = parseFloat(quantity);
            finalCurrentValue = pricePerGram * quantityInGrams;
            
            console.log(`✅ Gold price fetched on creation:`);
            console.log(`   Source: ${goldData.source || 'API'}`);
            console.log(`   Price per 10g: ₹${pricePer10Grams.toLocaleString('en-IN')}`);
            console.log(`   Price per gram: ₹${pricePerGram.toFixed(2)}`);
            console.log(`   Quantity: ${quantityInGrams}g`);
            console.log(`   Calculated current value: ₹${finalCurrentValue.toFixed(2)}`);
            console.log(`   Amount invested: ₹${amountInvested || 'N/A'}`);
          } else if (amountInvested && parseFloat(amountInvested) > 0) {
            // Estimate quantity based on invested amount
            // Use purchase price if provided, otherwise use current market price
            let purchasePricePerGram = pricePerGram;
            if (purchasePrice && parseFloat(purchasePrice) > 0) {
              purchasePricePerGram = parseFloat(purchasePrice);
            }
            
            const estimatedGrams = parseFloat(amountInvested) / purchasePricePerGram;
            finalCurrentValue = pricePerGram * estimatedGrams;
            
            console.log(`✅ Gold price fetched on creation (estimated):`);
            console.log(`   Source: ${goldData.source || 'API'}`);
            console.log(`   Current price per 10g: ₹${pricePer10Grams.toLocaleString('en-IN')}`);
            console.log(`   Current price per gram: ₹${pricePerGram.toFixed(2)}`);
            console.log(`   Purchase price per gram: ₹${purchasePricePerGram.toFixed(2)}`);
            console.log(`   Estimated grams: ${estimatedGrams.toFixed(2)}g`);
            console.log(`   Calculated current value: ₹${finalCurrentValue.toFixed(2)}`);
            console.log(`   Amount invested: ₹${amountInvested}`);
            
            // Suggest quantity to user
            if (!quantity || parseFloat(quantity) === 0) {
              console.log(`   💡 Suggested quantity: ${estimatedGrams.toFixed(2)}g`);
            }
          } else {
            console.log(`⚠️ Gold investment missing both quantity and amountInvested`);
            console.log(`   Using provided currentValue or defaulting to 0`);
          }
        } else {
          console.log(`⚠️ Gold price data not available or invalid`);
          console.log(`   Received data:`, goldData);
        }
      } catch (error) {
        console.error(`❌ Error fetching gold price on creation:`, error.message);
        console.error(`   Stack:`, error.stack);
        console.log(`⚠️ Using invested amount as current value if available`);
      }
    }
    // For SIP - calculate based on time invested
    else if (type === 'sip') {
      if (sipAmount && purchaseDate) {
        try {
          const monthsInvested = Math.floor(
            (new Date() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 30)
          );
          if (monthsInvested > 0) {
            // SIP calculation with 12% annual return (1% monthly)
            const monthlyReturn = 0.01;
            let totalValue = 0;
            for (let i = 0; i < monthsInvested; i++) {
              totalValue = (totalValue + parseFloat(sipAmount)) * (1 + monthlyReturn);
            }
            finalCurrentValue = totalValue;
            console.log(`✅ Calculated SIP value: ₹${finalCurrentValue} for ${monthsInvested} months`);
          }
        } catch (error) {
          console.log('⚠️ Could not calculate SIP value, using provided/default value');
        }
      }
    }
    // For FD - calculate based on interest and time
    else if (type === 'fd') {
      if (interestRate && purchaseDate && amountInvested) {
        try {
          const currentDate = new Date();
          const purchaseDateObj = new Date(purchaseDate);
          const elapsedYears = (currentDate - purchaseDateObj) / (1000 * 60 * 60 * 24 * 365);
          
          if (maturityDate) {
            const maturityDateObj = new Date(maturityDate);
            if (maturityDateObj > currentDate) {
              // Not yet matured - calculate current value
              finalCurrentValue = parseFloat(amountInvested) * Math.pow(
                1 + parseFloat(interestRate) / 100,
                elapsedYears
              );
            } else {
              // Matured - calculate final value
              const totalYears = (maturityDateObj - purchaseDateObj) / (1000 * 60 * 60 * 24 * 365);
              finalCurrentValue = parseFloat(amountInvested) * Math.pow(
                1 + parseFloat(interestRate) / 100,
                totalYears
              );
            }
            console.log(`✅ Calculated FD value: ₹${finalCurrentValue} (${elapsedYears.toFixed(2)} years elapsed)`);
          }
        } catch (error) {
          console.log('⚠️ Could not calculate FD value, using provided/default value');
        }
      }
    }

    // Ensure finalCurrentValue is a valid number
    const validatedCurrentValue = parseFloat(finalCurrentValue);
    const validatedAmountInvested = parseFloat(amountInvested);
    
    // If currentValue is NaN or invalid, use amountInvested
    const safeCurrentValue = (!isNaN(validatedCurrentValue) && validatedCurrentValue > 0) 
      ? validatedCurrentValue 
      : (!isNaN(validatedAmountInvested) && validatedAmountInvested > 0)
      ? validatedAmountInvested
      : 0;
    
    const investment = new Investment({
      userId: req.user.id,
      type,
      name,
      symbol: symbol?.toUpperCase(),
      amountInvested: validatedAmountInvested,
      currentValue: safeCurrentValue,
      quantity: quantity ? parseFloat(quantity) : undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      maturityDate: maturityDate ? new Date(maturityDate) : undefined,
      sipAmount: sipAmount ? parseFloat(sipAmount) : undefined,
      sipFrequency,
      riskLevel: riskLevel || 'medium',
      notes: notes?.trim()
    });

    await investment.save();
    
    // Log the final currentValue for debugging
    const returns = investment.currentValue - investment.amountInvested;
    const returnsPercentage = investment.amountInvested > 0 
      ? (returns / investment.amountInvested) * 100 
      : 0;
    
    console.log(`✅ Investment created: ${investment.name} (${investment.type})`);
    console.log(`   Amount Invested: ₹${investment.amountInvested.toLocaleString()}`);
    console.log(`   Current Value: ₹${investment.currentValue.toLocaleString()}`);
    console.log(`   Returns: ₹${returns.toLocaleString()} (${returnsPercentage >= 0 ? '+' : ''}${returnsPercentage.toFixed(2)}%)`);
    
    res.status(201).json({ 
      message: 'Investment added successfully',
      investment 
    });
  } catch (error) {
    console.error('Error creating investment:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to create investment' });
  }
});

// Update investment
router.put('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'symbol', 'amountInvested', 'currentValue', 'quantity',
      'purchasePrice', 'purchaseDate', 'interestRate', 'maturityDate',
      'sipAmount', 'sipFrequency', 'riskLevel', 'notes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'symbol') {
          investment[field] = req.body[field]?.toUpperCase();
        } else if (field === 'purchaseDate' || field === 'maturityDate') {
          investment[field] = new Date(req.body[field]);
        } else if (typeof req.body[field] === 'number') {
          investment[field] = parseFloat(req.body[field]);
        } else {
          investment[field] = req.body[field];
        }
      }
    });

    await investment.save();
    res.json({ 
      message: 'Investment updated successfully',
      investment 
    });
  } catch (error) {
    console.error('Error updating investment:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Failed to update investment' });
  }
});

// Delete investment (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    investment.isActive = false;
    await investment.save();

    res.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({ message: 'Failed to delete investment' });
  }
});

// Get portfolio dashboard data
router.get('/dashboard/summary', auth, async (req, res) => {
  try {
    const investments = await Investment.find({
      userId: req.user.id,
      isActive: true
    });

    const totalInvested = investments.reduce((sum, inv) => {
      const amount = parseFloat(inv.amountInvested) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalCurrentValue = investments.reduce((sum, inv) => {
      const currentVal = parseFloat(inv.currentValue);
      const investedVal = parseFloat(inv.amountInvested) || 0;
      // Use currentValue if valid, otherwise fallback to amountInvested
      const value = (!isNaN(currentVal) && currentVal > 0) ? currentVal : investedVal;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const totalReturns = totalCurrentValue - totalInvested;
    const totalReturnsPercentage = totalInvested > 0 
      ? (totalReturns / totalInvested) * 100 
      : 0;

    // Calculate risk level (weighted average)
    const riskWeights = { low: 1, medium: 2, high: 3 };
    const totalRiskWeight = investments.reduce((sum, inv) => {
      const weight = riskWeights[inv.riskLevel] || 2;
      return sum + (weight * inv.amountInvested);
    }, 0);
    
    let portfolioRiskLevel = 'medium';
    if (totalInvested > 0) {
      const avgRiskWeight = totalRiskWeight / totalInvested;
      if (avgRiskWeight < 1.5) portfolioRiskLevel = 'low';
      else if (avgRiskWeight > 2.5) portfolioRiskLevel = 'high';
    }

    res.json({
      totalInvested: isNaN(totalInvested) ? 0 : totalInvested,
      currentPortfolioValue: isNaN(totalCurrentValue) ? 0 : totalCurrentValue,
      totalReturns: isNaN(totalReturns) ? 0 : totalReturns,
      totalReturnsPercentage: isNaN(totalReturnsPercentage) ? 0 : totalReturnsPercentage,
      portfolioRiskLevel,
      totalInvestments: investments.length
    });
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    res.status(500).json({ message: 'Failed to fetch portfolio summary' });
  }
});

// Get portfolio analysis (asset allocation)
router.get('/dashboard/analysis', auth, async (req, res) => {
  try {
    const investments = await Investment.find({
      userId: req.user.id,
      isActive: true
    });

    const totalValue = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.amountInvested), 0);

    // Asset allocation by type
    const allocationByType = investments.reduce((acc, inv) => {
      const value = inv.currentValue || inv.amountInvested;
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      
      if (!acc[inv.type]) {
        acc[inv.type] = { amount: 0, percentage: 0, count: 0 };
      }
      acc[inv.type].amount += value;
      acc[inv.type].percentage += percentage;
      acc[inv.type].count += 1;
      
      return acc;
    }, {});

    // Risk exposure
    const riskExposure = investments.reduce((acc, inv) => {
      const value = inv.currentValue || inv.amountInvested;
      if (!acc[inv.riskLevel]) {
        acc[inv.riskLevel] = { amount: 0, percentage: 0 };
      }
      acc[inv.riskLevel].amount += value;
      acc[inv.riskLevel].percentage += totalValue > 0 ? (value / totalValue) * 100 : 0;
      return acc;
    }, {});

    res.json({
      allocationByType,
      riskExposure,
      totalPortfolioValue: totalValue
    });
  } catch (error) {
    console.error('Error fetching portfolio analysis:', error);
    res.status(500).json({ message: 'Failed to fetch portfolio analysis' });
  }
});

// Get yearly investment summary
router.get('/summary/yearly/:year', auth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const investments = await Investment.find({
      userId: req.user.id,
      isActive: true,
      purchaseDate: { $gte: startDate, $lte: endDate }
    });

    if (investments.length === 0) {
      return res.json({
        year,
        message: 'No investments found for this year',
        summary: null
      });
    }

    // Calculate best and worst performing
    const investmentsWithReturns = investments.map(inv => ({
      ...inv.toObject(),
      returns: (inv.currentValue || inv.amountInvested) - inv.amountInvested,
      returnsPercentage: inv.amountInvested > 0 
        ? ((inv.currentValue || inv.amountInvested) - inv.amountInvested) / inv.amountInvested * 100 
        : 0
    }));

    const bestPerformer = investmentsWithReturns.reduce((best, inv) => 
      inv.returnsPercentage > best.returnsPercentage ? inv : best
    );

    const worstPerformer = investmentsWithReturns.reduce((worst, inv) => 
      inv.returnsPercentage < worst.returnsPercentage ? inv : worst
    );

    // Most consistent asset (lowest volatility - for now, use type with most investments)
    const typeCounts = investments.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + 1;
      return acc;
    }, {});
    const mostConsistentType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b
    );

    // Overall portfolio behavior
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amountInvested, 0);
    const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.amountInvested), 0);
    const overallReturns = totalCurrentValue - totalInvested;
    const overallReturnsPercentage = totalInvested > 0 
      ? (overallReturns / totalInvested) * 100 
      : 0;

    res.json({
      year,
      summary: {
        totalInvestments: investments.length,
        totalInvested,
        totalCurrentValue,
        overallReturns,
        overallReturnsPercentage,
        bestPerformer: {
          name: bestPerformer.name,
          type: bestPerformer.type,
          returns: bestPerformer.returns,
          returnsPercentage: bestPerformer.returnsPercentage
        },
        worstPerformer: {
          name: worstPerformer.name,
          type: worstPerformer.type,
          returns: worstPerformer.returns,
          returnsPercentage: worstPerformer.returnsPercentage
        },
        mostConsistentAsset: mostConsistentType,
        investmentsByType: typeCounts
      }
    });
  } catch (error) {
    console.error('Error fetching yearly summary:', error);
    res.status(500).json({ message: 'Failed to fetch yearly summary' });
  }
});

// Update current prices for all investments
router.post('/update-prices', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const investments = await Investment.find({
      userId: userId,
      isActive: true
    });

    const updatedInvestments = [];
    const errors = [];

    for (const investment of investments) {
      try {
        let priceData = null;
        let newCurrentValue = investment.currentValue || investment.amountInvested;

        switch (investment.type) {
          case 'stock':
            if (investment.symbol) {
              priceData = await fetchStockPrice(investment.symbol);
              if (priceData && investment.quantity) {
                newCurrentValue = priceData.price * investment.quantity;
              } else if (priceData && investment.amountInvested && investment.purchasePrice) {
                const priceChange = priceData.price / investment.purchasePrice;
                newCurrentValue = investment.amountInvested * priceChange;
              }
            }
            break;

          case 'etf':
            if (investment.symbol) {
              priceData = await getETFPrice(investment.symbol);
              if (priceData && investment.quantity) {
                newCurrentValue = priceData.price * investment.quantity;
              } else if (priceData && investment.amountInvested && investment.purchasePrice) {
                const priceChange = priceData.price / investment.purchasePrice;
                newCurrentValue = investment.amountInvested * priceChange;
              }
            }
            break;

          case 'mutual_fund':
            if (investment.name || investment.symbol) {
              const navData = await getMutualFundNAV(investment.name || investment.symbol);
              if (navData) {
                if (investment.quantity) {
                  newCurrentValue = navData.nav * investment.quantity;
                } else if (investment.amountInvested && investment.purchasePrice) {
                  const navChange = navData.nav / investment.purchasePrice;
                  newCurrentValue = investment.amountInvested * navChange;
                } else {
                  newCurrentValue = investment.amountInvested * (navData.nav / 100);
                }
              }
            }
            break;

          case 'gold':
            const goldData = await getGoldPrice();
            if (goldData && investment.quantity) {
              const units = investment.quantity / 10;
              newCurrentValue = goldData.price * units;
            } else if (goldData && investment.amountInvested) {
              const estimatedPricePerGram = goldData.price / 10;
              const estimatedGrams = investment.amountInvested / (estimatedPricePerGram * 0.9);
              newCurrentValue = estimatedPricePerGram * estimatedGrams;
            }
            break;

          case 'sip':
            const monthsInvested = Math.floor(
              (new Date() - new Date(investment.purchaseDate)) / (1000 * 60 * 60 * 24 * 30)
            );
            if (investment.sipAmount && monthsInvested > 0) {
              const monthlyReturn = 0.01;
              let totalValue = 0;
              for (let i = 0; i < monthsInvested; i++) {
                totalValue = (totalValue + investment.sipAmount) * (1 + monthlyReturn);
              }
              newCurrentValue = totalValue;
            }
            break;

          case 'fd':
            if (investment.interestRate && investment.maturityDate) {
              const maturityDate = new Date(investment.maturityDate);
              const purchaseDate = new Date(investment.purchaseDate);
              const currentDate = new Date();
              const elapsedYears = (currentDate - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
              
              if (maturityDate > currentDate) {
                newCurrentValue = investment.amountInvested * Math.pow(
                  1 + investment.interestRate / 100,
                  elapsedYears
                );
              } else {
                const totalYears = (maturityDate - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
                newCurrentValue = investment.amountInvested * Math.pow(
                  1 + investment.interestRate / 100,
                  totalYears
                );
              }
            }
            break;
        }

        if (newCurrentValue !== investment.currentValue) {
          investment.currentValue = newCurrentValue;
          await investment.save();
          updatedInvestments.push({
            id: investment._id,
            name: investment.name,
            newValue: newCurrentValue
          });
        }
      } catch (error) {
        errors.push({
          id: investment._id,
          name: investment.name,
          error: error.message
        });
      }
    }

    res.json({
      message: `Updated ${updatedInvestments.length} investments`,
      updated: updatedInvestments,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ message: 'Failed to update prices', error: error.message });
  }
});

module.exports = router;
