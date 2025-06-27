const API_BASE_URL = 'http://localhost:5000/api'; // Replace with your actual backend URL

export const budgetService = {
  async createSplitExpense(splitExpense) {
    const response = await fetch(`${API_BASE_URL}/split-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(splitExpense),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create split expense');
    }

    return response.json();
  },
  async getBudgets() {
    const response = await fetch(`${API_BASE_URL}/budgets`);
    if (!response.ok) {
      throw new Error('Failed to fetch budgets');
    }
    return response.json();
  },
};
