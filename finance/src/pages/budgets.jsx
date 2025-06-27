import React, { useState, useEffect } from 'react';
import { PlusCircle, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

import Navbar from '@/components/navbar';
import BudgetCard from './BudgetCard';
import BudgetChart from './BudgetChart';
import BudgetTable from './BudgetTable';
import AddBudgetModal from './AddBudgetModal';

const Budgets = () => {
  const [budgetData, setBudgetData] = useState([]); // Store the fetched budget data
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('April 2025');
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const months = [
    'April 2025',
    'March 2025',
    'February 2025',
    'January 2025',
    'December 2024',
  ];

  useEffect(() => {
    fetchBudgets();
  }, []); // Fetch budgets on component mount

  const fetchBudgets = async () => {
    const token = localStorage.getItem('token');
    console.log('Token:', token); 

    try {
      const res = await fetch('http://localhost:5000/api/budget', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.log('Unauthorized: Token might be invalid or expired.');
        } else {
          console.log(`Error: ${res.status} - ${res.statusText}`);
        }
        return;
      }

      const data = await res.json();
      console.log('Budget Data:', data);

      // Update the state with the fetched data
      setBudgetData(data.budgets); // Set budget data to the state

    } catch (error) {
      console.log('An error occurred:', error);
      setError('Failed to fetch budget data.');
    } finally {
      setLoading(false); // Set loading to false when the fetch is done
    }
  };

  const handleAddOrUpdateBudget = async (budget) => {
    const token = localStorage.getItem('token');
    const updatedBudget = { ...budget, month: selectedMonth, spent: budget.spent || 0 };

    try {
      const url = editData ? `http://localhost:5000/api/budget/${editData._id}` : 'http://localhost:5000/api/budget';
      const method = editData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedBudget),
      });

      if (!res.ok) throw new Error('Failed to save budget');

      toast.success(`Budget ${editData ? 'updated' : 'added'} successfully`);
      fetchBudgets(); // Re-fetch budgets after adding/updating
    } catch (err) {
      toast.error(err.message);
    }

    setIsAddModalOpen(false);
    setEditData(null);
  };

  const handleDeleteBudget = async (id, categoryName) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/budget/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete budget');

      toast.success(`${categoryName} budget deleted successfully`);
      fetchBudgets(); // Re-fetch budgets after deleting
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredBudgetData = budgetData.filter(item => item.month === selectedMonth);
  const totalBudget = filteredBudgetData.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSpent = filteredBudgetData.reduce((acc, curr) => acc + curr.spent, 0);
  const remaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const remainingPercentage = totalBudget ? Math.round((remaining / totalBudget) * 100) : 0;

  if (loading) return <div>Loading...</div>; // Loading state
  if (error) return <div className="min-h-screen flex justify-center items-center text-red-600">{error}</div>; // Error state

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white">
      <Navbar />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Budget Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Track and manage your monthly expenses</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10"
              >
                {months.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            <button
              onClick={() => {
                setEditData(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <PlusCircle className="h-4 w-4" />
              New Budget
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <BudgetCard title="Total Budget" amount={totalBudget} type="budget" percentage={100} trend="neutral" />
          <BudgetCard title="Total Spent" amount={totalSpent} type="spent" percentage={spentPercentage} trend="up" />
          <BudgetCard title="Remaining" amount={remaining} type="remaining" percentage={remainingPercentage} trend="down" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Spending Breakdown</h2>
            <BudgetChart data={filteredBudgetData} />
          </div>
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border dark:border-gray-700">
            <BudgetTable
              data={filteredBudgetData}
              onEdit={(index) => {
                setEditData(filteredBudgetData[index]);
                setIsAddModalOpen(true);
              }}
              onDelete={(index) => {
                const item = filteredBudgetData[index];
                if (item) handleDeleteBudget(item._id, item.category);
              }}
              onAdd={() => {
                setEditData(null);
                setIsAddModalOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      <AddBudgetModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditData(null);
        }}
        onAdd={handleAddOrUpdateBudget}
        selectedMonth={selectedMonth}
        isEditing={!!editData}
        existingData={editData}
      />
    </div>
  );
};

export default Budgets;
