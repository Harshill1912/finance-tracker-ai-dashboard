import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function MonthlySpending({ monthlyData }) {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 mt-6">
        No data available for Monthly Spending.
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md mb-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
          📈 Monthly Spending
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Trends over the last few months
        </p>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="4 4" stroke="#ccc" />
            <XAxis dataKey="month" stroke="#8884d8" />
            <YAxis stroke="#8884d8" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', backgroundColor: '#f9f9f9' }}
              formatter={(value) => [`₹${value}`, 'Spent']}
            />
            <Line
              type="monotone"
              dataKey="spent" 
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#6366f1', strokeWidth: 2, fill: 'white' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default MonthlySpending;
