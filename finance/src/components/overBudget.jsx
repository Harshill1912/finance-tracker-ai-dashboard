import React from 'react';
import { AlertTriangle } from 'lucide-react'; // Optional: Lucide icon for better visuals

function OverBudget({ data }) {
  const overBudgetItems = data.filter(item => item.spent > item.amount);

  if (overBudgetItems.length === 0) return null;

  return (
    <section className="mb-6 mt-2 bg-white p-6 rounded-2xl shadow-lg dark:bg-gray-900">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">🚨 Over Budget Items</h2>
      <div className="space-y-4">
        {overBudgetItems.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 bg-red-100 border border-red-300 rounded-xl dark:bg-red-900 dark:border-red-700 dark:text-white"
          >
            <AlertTriangle className="text-red-600 dark:text-red-400 h-5 w-5 mt-1" />
            <div>
              <p className="text-sm font-medium">
                <span className="font-semibold">{item.category}</span> is over budget by <span className="text-red-700 dark:text-red-300 font-bold">₹{item.spent - item.amount}</span>.
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Budgeted: ₹{item.amount} | Spent: ₹{item.spent}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default OverBudget;
