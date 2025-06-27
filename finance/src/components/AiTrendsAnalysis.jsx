import React, { useEffect, useState } from 'react';
import {
  Lightbulb,
  TrendingDown,
  AlertTriangle,
  PiggyBank,
} from 'lucide-react';

const AiTrendsAnalysis = ({ budgetData = [], monthlyData = [] }) => {
  const [insightsList, setInsightsList] = useState([]);

  useEffect(() => {
    const insights = [];

    const avgMonthlySpend =
      monthlyData.reduce((acc, curr) => acc + curr.value, 0) / (monthlyData.length || 1);
    const recentMonths = monthlyData.slice(-3);

    if (
      recentMonths.length === 3 &&
      recentMonths[2].value < recentMonths[1].value &&
      recentMonths[1].value < recentMonths[0].value
    ) {
      insights.push({
        title: 'Spending is consistently decreasing 📉',
        description: 'Great job! Your expenses have decreased consistently over the past 3 months.',
        icon: <TrendingDown className="h-5 w-5 text-blue-500" />,
        type: 'info',
      });
    }

    const overBudgetItems = budgetData.filter((item) => item.amount > avgMonthlySpend);
    if (overBudgetItems.length > 0) {
      insights.push({
        title: 'Overspending Alert 🚨',
        description: `You exceeded your average spending on ${overBudgetItems[0].category}. Try to cut back a bit.`,
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
        type: 'alert',
      });
    }

    const lowestMonth = monthlyData.reduce(
      (min, curr) => (curr.value < min.value ? curr : min),
      monthlyData[0] || { value: Infinity }
    );
    if (lowestMonth.value < avgMonthlySpend * 0.6) {
      insights.push({
        title: 'Great Saving Month! 🎉',
        description: `You saved significantly in ${lowestMonth.month}. Keep it up!`,
        icon: <PiggyBank className="h-5 w-5 text-green-600" />,
        type: 'positive',
      });
    }

    for (let i = 1; i < monthlyData.length; i++) {
      const change = monthlyData[i].value - monthlyData[i - 1].value;
      if (change > avgMonthlySpend * 0.5) {
        insights.push({
          title: 'Spending Spike 📈',
          description: `You spent significantly more in ${monthlyData[i].month}. Check what changed.`,
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          type: 'warning',
        });
        break;
      }
    }

    setInsightsList(insights);
  }, [budgetData, monthlyData]);

  return (
    <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
        <Lightbulb className="h-6 w-6 text-yellow-500" />
        AI Budget Insights
      </h2>

      {insightsList.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No insights available at the moment.</p>
      ) : (
        <ul className="space-y-5">
          {insightsList.map((insight, index) => (
            <li
              key={index}
              className={`p-5 rounded-xl border shadow-sm transition-all
                ${
                  insight.type === 'alert'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-600'
                    : insight.type === 'positive'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-600'
                    : insight.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-600'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {insight.icon}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AiTrendsAnalysis;
