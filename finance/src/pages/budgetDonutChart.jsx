import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#ff6b6b', '#6bcf63', '#ffd93d', '#4d96ff'];

const CustomCenterLabel = ({ spent, total }) => {
  const percentage = ((spent / total) * 100).toFixed(0);
  const color = percentage > 80 ? 'text-red-600' : percentage > 50 ? 'text-yellow-500' : 'text-green-600';

  return (
    <div className="absolute inset-0 flex items-center justify-center flex-col">
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6 }}
        className={`text-2xl font-bold ${color}`}
      >
        {percentage}%
      </motion.span>
      <span className="text-sm text-gray-500 dark:text-gray-400">Spent</span>
    </div>
  );
};

const BudgetDonutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const spent = data.reduce((sum, item) => sum + (item.spent || 0), 0);

  return (
    <motion.div
      className="relative w-full h-[300px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="spent"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            cornerRadius={6}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "#f9fafb", borderRadius: '8px' }} />
        </PieChart>
      </ResponsiveContainer>
      <CustomCenterLabel spent={spent} total={total} />
    </motion.div>
  );
};

export default BudgetDonutChart;