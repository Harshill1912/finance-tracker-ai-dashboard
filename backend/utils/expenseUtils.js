// Utility functions for expense analysis using real data

/**
 * Calculate category averages from actual expense data
 */
const calculateCategoryAverages = (expenses) => {
  const categoryTotals = {};
  const categoryCounts = {};
  
  expenses.forEach(exp => {
    if (exp.category && exp.amount) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      categoryCounts[exp.category] = (categoryCounts[exp.category] || 0) + 1;
    }
  });
  
  const averages = {};
  Object.keys(categoryTotals).forEach(category => {
    averages[category] = categoryTotals[category] / categoryCounts[category];
  });
  
  return averages;
};

/**
 * Detect expense anomalies based on real data patterns
 */
const detectAnomaly = (expense, userExpenses) => {
  const reasons = [];
  
  // Get expenses in the same category
  const categoryExpenses = userExpenses.filter(e => 
    e.category === expense.category && e._id.toString() !== expense._id?.toString()
  );
  
  if (categoryExpenses.length > 0) {
    // Calculate average for this category
    const categoryAverage = categoryExpenses.reduce((sum, e) => sum + e.amount, 0) / categoryExpenses.length;
    
    // Check if expense is > 2x average
    if (expense.amount > categoryAverage * 2) {
      reasons.push(`Amount (₹${expense.amount}) is ${(expense.amount / categoryAverage).toFixed(1)}x your average spending (₹${Math.round(categoryAverage)}) in ${expense.category}`);
    }
  }
  
  // Check time pattern (expense added outside normal hours - 9 AM to 9 PM)
  const expenseHour = new Date(expense.date || new Date()).getHours();
  if (expenseHour < 9 || expenseHour > 21) {
    reasons.push(`Expense added outside normal hours (${expenseHour}:00)`);
  }
  
  return {
    isAnomaly: reasons.length > 0,
    reasons: reasons
  };
};

/**
 * Extract merchant name from description using patterns
 */
const extractMerchant = (description) => {
  const commonMerchants = [
    'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Uber', 'Ola', 
    'Big Bazaar', 'DMart', 'Reliance', 'Tata', 'Paytm', 'PhonePe',
    'Google Pay', 'GPay', 'Razorpay', 'Stripe'
  ];
  
  const desc = description.toLowerCase();
  for (const merchant of commonMerchants) {
    if (desc.includes(merchant.toLowerCase())) {
      return merchant;
    }
  }
  
  // Extract first capitalized word (likely merchant)
  const words = description.split(' ');
  const capitalizedWord = words.find(word => 
    word.length > 2 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()
  );
  
  return capitalizedWord || '';
};

/**
 * Detect payment method from description
 */
const detectPaymentMethod = (description) => {
  const desc = description.toLowerCase();
  
  if (desc.includes('upi') || desc.includes('gpay') || desc.includes('phonepe') || desc.includes('paytm')) {
    return 'UPI';
  }
  if (desc.includes('card') || desc.includes('debit') || desc.includes('credit')) {
    return 'Card';
  }
  if (desc.includes('cash')) {
    return 'Cash';
  }
  if (desc.includes('online') || desc.includes('amazon') || desc.includes('flipkart') || desc.includes('swiggy') || desc.includes('zomato')) {
    return 'Online';
  }
  
  return 'Other';
};

module.exports = {
  calculateCategoryAverages,
  detectAnomaly,
  extractMerchant,
  detectPaymentMethod
};
