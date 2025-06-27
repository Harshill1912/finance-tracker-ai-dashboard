import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const BudgetCard = ({ title, amount, type, percentage, trend }) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'budget':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/30';
      case 'spent':
        return 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/50 dark:to-red-800/30';
      case 'remaining':
        return 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/50 dark:to-green-800/30';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'budget':
        return 'text-blue-700 dark:text-blue-300';
      case 'spent':
        return 'text-red-700 dark:text-red-300';
      case 'remaining':
        return 'text-green-700 dark:text-green-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  const formattedAmount = !isNaN(Number(amount))
    ? Number(amount).toLocaleString()
    : '0';

  return (
    <div
      className={`${getBackgroundColor()} rounded-2xl shadow-sm p-6 h-full transition-all duration-300 hover:shadow-md`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`text-lg font-medium ${getTextColor()}`}>{title}</h3>
        {trend && (
          <span
            className={`flex items-center text-xs font-medium ${
              trend === 'up'
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {trend === 'up' ? (
              <>
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {percentage}%
              </>
            ) : (
              <>
                <ArrowDownRight className="h-3 w-3 mr-1" />
                {percentage}%
              </>
            )}
          </span>
        )}
      </div>

      <h1 className="text-3xl font-bold mb-2">₹{formattedAmount}</h1>

      {percentage !== undefined && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full ${
              type === 'spent'
                ? 'bg-red-500'
                : type === 'remaining'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, percentage))}%`,
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default BudgetCard;
