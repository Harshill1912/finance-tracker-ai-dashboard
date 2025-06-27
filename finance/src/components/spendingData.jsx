import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f7f", "#a29bfe"];

// ✅ Only show category name
const renderCustomLabel = ({ category }) => {
  const shortName = category.length > 10 ? category.slice(0, 8) + '…' : category;
  return `${shortName}`;
};

function SpendingData({ spendingData }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-4 border-b pb-2">
        Spending By Category
      </h2>

      <div className="flex justify-center items-center h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={spendingData}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderCustomLabel}
              fill="#8884d8"
            >
              {spendingData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => [`₹${value}`, props.payload.category]}
              contentStyle={{ backgroundColor: '#f9f9f9', borderRadius: '8px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SpendingData;
