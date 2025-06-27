import { useState } from "react";

const AddExpenseForm = () => {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    paidBy: "",
    sharedWith: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Add Shared Expense</h2>
      <form className="space-y-4">
        <input
          type="text"
          name="title"
          placeholder="Expense Title (e.g., Dinner)"
          value={form.title}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <input
          type="number"
          name="amount"
          placeholder="Amount (₹)"
          value={form.amount}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <input
          type="text"
          name="paidBy"
          placeholder="Paid by (e.g., Alice)"
          value={form.paidBy}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <input
          type="text"
          name="sharedWith"
          placeholder="Shared with (comma separated, e.g., Bob, Charlie)"
          value={form.sharedWith}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Add Expense
        </button>
      </form>
    </div>
  );
};

export default AddExpenseForm;
