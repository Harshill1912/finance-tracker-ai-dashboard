import React from 'react';

function Feature() {
  return (
    <div className='px-8 mx-auto mt-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>

        {/* 1st feature */}
        <div className="w-[90%] max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white text-center">Track Your Expenses Effortlessly</h1>
          <img src="/expense.png" alt="Expense Tracker" className="w-40 mx-auto my-4 transition-transform duration-300 hover:scale-110" />
          <p className="text-xl text-gray-600 dark:text-gray-300 text-center">
            Monitor your spending, set budgets, and take control of your finances with real-time insights.
          </p>
          <h3 className="font-bold text-xl text-gray-800 dark:text-white mt-4 pl-4">Features</h3>
          <ul className="text-left pl-6 mt-2 space-y-2">
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              📊 <span>Real-Time Expense Tracking</span>
            </li>
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              📅 <span>Budget Planning</span>
            </li>
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              📈 <span>Insightful Reports</span>
            </li>
          </ul>
        </div>

        {/* 2nd feature */}
        <div className="w-[90%] max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white text-center">Gain Insights with Visual Expense Analytics</h1>
          <img src="/report.png" alt="Expense Tracker" className="w-40 mx-auto my-4 transition-transform duration-300 hover:scale-110" />
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center">
            Track your spending habits with interactive charts and detailed reports to help you make informed financial decisions
          </p>
          <h3 className="font-bold text-xl text-gray-800 dark:text-white mt-4 pl-4">Features</h3>
          <ul className="text-left pl-6 mt-2 space-y-2">
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              📉 <span>Customizable Graphs</span>
            </li>
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              🏷️ <span>Spending Categories</span>
            </li>
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              📆 <span>Monthly & Yearly Reports</span>
            </li>
          </ul>
        </div>

        {/* 3rd feature */}
        <div className="w-[90%] max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white text-center">Smart AI-Powered Financial Assistant</h1>
          <img src="/ai-finance.png" alt="Expense Tracker" className="w-40 mx-auto my-4 transition-transform duration-300 hover:scale-110" />
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center">
            Leverage AI to get automated financial insights, spending predictions, and smart recommendations tailored to your habits.
          </p>
          <h3 className="font-bold text-xl text-gray-800 dark:text-white mt-4 pl-4">Features</h3>
          <ul className="text-left pl-6 mt-2 space-y-2">
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              🧠 <span>AI-Powered Budgeting</span>
            </li>
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              💡 <span>Smart Suggestions</span>
            </li>
            <li className="flex items-center gap-2 transition-colors duration-300 hover:text-blue-600 dark:hover:text-blue-400">
              📌 <span>Expense Predictions</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default Feature;
