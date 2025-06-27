import React, { useState } from 'react';
import { Edit2, Trash2, Plus, AlertCircle } from 'lucide-react';
import EditBudgetForm from './EditBudgetForm';

const BudgetTable = ({ data, onEdit, onDelete, onAdd }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const handleEditClick = (index) => {
    setEditingIndex(index);
  };

  const handleSave = (updatedBudget) => {
    if (editingIndex !== null) {
      onEdit(editingIndex, updatedBudget);
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Budget Categories</h2>
        <button 
          onClick={onAdd}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50">
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Budget
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Spent
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Remaining
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, index) => (
            <React.Fragment key={`${item.category}-${index}`}>
              {editingIndex === index ? (
                <tr className="bg-blue-50 dark:bg-blue-900/20">
                  <td colSpan={6} className="px-6 py-4">
                    <EditBudgetForm 
                      budget={item} 
                      onSave={handleSave} 
                      onCancel={handleCancel} 
                    />
                  </td>
                </tr>
              ) : (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ₹{item.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ₹{item.spent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ₹{(item.amount - item.spent).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {item.spent > item.amount ? (
                        <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Over budget
                        </span>
                      ) : item.spent / item.amount > 0.8 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          Warning
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          On track
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(index)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(index)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BudgetTable;
