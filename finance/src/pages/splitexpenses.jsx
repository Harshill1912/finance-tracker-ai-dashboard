import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Users, DollarSign, Trash2, CheckCircle2, XCircle, Sparkles, Mail, Phone, User as UserIcon, Send, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/navbar';
import axios from 'axios';

const SplitExpenseForm = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [groupName, setGroupName] = useState(''); // Group name for organizing expenses
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '', phone: '' });
  const [participantType, setParticipantType] = useState('name'); // 'name', 'email', 'phone'
  const [splitExpenses, setSplitExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    fetchSplitExpenses();
    fetchBalances();
  }, []);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchSplitExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/splits`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSplitExpenses(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching split expenses:', error);
    }
  };

  const fetchBalances = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) return;

      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/splits/balances/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setBalances(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Recalculate shares when amount changes (Splitwise-style)
  useEffect(() => {
    const totalAmount = Number(amount) || 0;
    if (totalAmount > 0 && participants.length > 0) {
      // Divide equally among all participants (including you = participants.length + 1)
      const totalPeople = participants.length + 1; // +1 for the person who paid (you)
      const sharePerPerson = totalAmount / totalPeople;
      
      setParticipants(prevParticipants => prevParticipants.map(p => ({
        ...p,
        share: sharePerPerson
      })));
    }
  }, [amount, participants.length]);

  const addParticipant = () => {
    const { name, email, phone } = newParticipant;
    
    if (!name.trim()) {
      toast.error("Please enter a participant name");
      return;
    }

    // Validate based on type
    if (participantType === 'email' && !email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (participantType === 'phone' && !phone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    // Check for duplicates
    const isDuplicate = participants.some(p => {
      if (participantType === 'email' && p.email && email) {
        return p.email.toLowerCase() === email.toLowerCase();
      }
      if (participantType === 'phone' && p.phone && phone) {
        return p.phone === phone;
      }
      return p.name.toLowerCase() === name.toLowerCase();
    });

    if (isDuplicate) {
      toast.error("Participant already added");
      return;
    }

    const totalAmount = Number(amount) || 0;
    // Calculate share: divide by (current participants + new participant + you)
    const totalPeople = participants.length + 2; // +1 for new participant, +1 for you
    const sharePerPerson = totalAmount > 0 ? totalAmount / totalPeople : 0;

    const newParticipants = [
      ...participants,
      { 
        name, 
        email: email || undefined, 
        phone: phone || undefined,
        share: sharePerPerson,
        paidAmount: 0,
        paid: false
      }
    ];

    // Recalculate all shares to ensure equal distribution
    const recalculatedShare = totalAmount > 0 ? totalAmount / (newParticipants.length + 1) : 0;
    setParticipants(newParticipants.map(p => ({ ...p, share: recalculatedShare })));
    
    setNewParticipant({ name: '', email: '', phone: '' });
    setParticipantType('name');
  };

  const removeParticipant = (index) => {
    const newParticipants = participants.filter((_, i) => i !== index);
    const totalAmount = Number(amount) || 0;
    
    if (newParticipants.length === 0) {
      setParticipants([]);
      return;
    }
    
    // Recalculate: divide by (remaining participants + you)
    const totalPeople = newParticipants.length + 1; // +1 for you
    const sharePerPerson = totalAmount > 0 ? totalAmount / totalPeople : 0;
    
    setParticipants(newParticipants.map(p => ({ ...p, share: sharePerPerson })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description || !amount || participants.length === 0) {
      toast.error("Please fill all fields and add at least one participant");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      const splitExpense = {
        description,
        amount: Number(amount),
        groupName: groupName.trim() || null, // Include group name if provided
        participants: participants.map(p => ({
          name: p.name,
          email: p.email,
          phone: p.phone,
          share: p.share
        })),
      };

      const res = await axios.post(`${baseUrl}/api/splits`, splitExpense, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        timeout: 20000 // Increased timeout for user creation and balance updates
      });

      if (res.data.success) {
        toast.success("Split expense created successfully!");
        setDescription('');
        setAmount('');
        setGroupName(''); // Reset group name
        setParticipants([]);
        setNewParticipant({ name: '', email: '', phone: '' });
        setShowForm(false);
        fetchSplitExpenses();
        fetchBalances();
      } else {
        toast.error(res.data.message || "Failed to create split expense");
      }
    } catch (error) {
      console.error('Split expense error:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error("Request timed out. Please try again.");
      } else if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error || "Failed to create split expense";
        toast.error(errorMsg);
      } else if (error.request) {
        toast.error("No response from server. Please check your connection.");
      } else {
        toast.error("An error occurred while creating the expense");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (expenseId, participantId, amount) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Please login to record payments");
        return;
      }

      const baseUrl = await getBaseUrl();
      
      // Validate inputs
      if (!participantId) {
        toast.error("Participant ID is missing");
        return;
      }

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast.error("Invalid payment amount");
        return;
      }
      
      const res = await axios.post(
        `${baseUrl}/api/splits/${expenseId}/payment`, 
        {
          participantId,
          amount: paymentAmount,
          paymentMethod: 'MANUAL'
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }
      );

      if (res.data.success) {
        toast.success("Payment recorded successfully!");
        fetchSplitExpenses();
        fetchBalances();
      } else {
        toast.error(res.data.message || "Failed to record payment");
      }
    } catch (error) {
      console.error('Payment error:', error);
      if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error || "Failed to record payment";
        toast.error(errorMsg);
      } else if (error.request) {
        toast.error("No response from server. Please check your connection.");
      } else {
        toast.error("An error occurred while recording payment");
      }
    }
  };

  const generatePaymentLink = async (expenseId, participantId) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      const res = await axios.post(`${baseUrl}/api/splits/${expenseId}/payment-link`, {
        participantId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        navigator.clipboard.writeText(res.data.paymentLink);
        toast.success("Payment link copied to clipboard!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate payment link");
    }
  };

  const sendReminder = async (expenseId, participantId) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      const res = await axios.post(`${baseUrl}/api/splits/${expenseId}/reminder`, {
        participantId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Reminder sent!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reminder");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this split expense?')) return;

    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      const res = await axios.delete(`${baseUrl}/api/splits/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Split expense deleted!");
        fetchSplitExpenses();
        fetchBalances();
      }
    } catch (error) {
      toast.error("Failed to delete split expense");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              Split Expenses
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Split bills and expenses with friends</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Split
          </Button>
        </motion.div>

        {/* Balances Summary */}
        {balances.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Your Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {balances.map((balance, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${balance.owesYou ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-medium">{balance.user?.name || 'Unknown'}</span>
                      </div>
                      <span className={`font-semibold ${balance.owesYou ? 'text-green-600' : 'text-red-600'}`}>
                        {balance.owesYou ? 'Owes you' : 'You owe'} ₹{Math.abs(balance.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Create Split Expense
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Dinner, Movie, Groceries, etc."
                        required
                      />
                    </div>

                    <div>
                      <Label>Group Name (Optional)</Label>
                      <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g., Roommates, Family Trip, Friends Group"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Create or join a splitting group to organize expenses together
                      </p>
                    </div>

                    <div>
                      <Label>Total Amount (₹)</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          // Recalculate shares when amount changes (Splitwise-style)
                          const totalAmount = Number(e.target.value) || 0;
                          if (participants.length > 0) {
                            // Divide by (participants + you)
                            const totalPeople = participants.length + 1;
                            const sharePerPerson = totalAmount / totalPeople;
                            setParticipants(participants.map(p => ({ ...p, share: sharePerPerson })));
                          }
                        }}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                      {amount && participants.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ₹{amount} ÷ {participants.length + 1} people = ₹{(Number(amount) / (participants.length + 1)).toFixed(2)} each
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Add Participants</Label>
                      <div className="mb-2">
                        <div className="flex gap-2 mb-2">
                          <Button
                            type="button"
                            variant={participantType === 'name' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setParticipantType('name')}
                          >
                            <UserIcon className="h-4 w-4 mr-1" />
                            Name Only
                          </Button>
                          <Button
                            type="button"
                            variant={participantType === 'email' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setParticipantType('email')}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                          <Button
                            type="button"
                            variant={participantType === 'phone' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setParticipantType('phone')}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Phone
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newParticipant.name}
                          onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                          placeholder="Participant name"
                          className="flex-1"
                        />
                        {participantType === 'email' && (
                          <Input
                            type="email"
                            value={newParticipant.email}
                            onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                            placeholder="email@example.com"
                            className="flex-1"
                          />
                        )}
                        {participantType === 'phone' && (
                          <Input
                            type="tel"
                            value={newParticipant.phone}
                            onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                            placeholder="+91 1234567890"
                            className="flex-1"
                          />
                        )}
                        <Button type="button" onClick={addParticipant} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {participantType === 'name' && 'Guest user (offline)'}
                        {participantType === 'email' && 'Will receive email invitation'}
                        {participantType === 'phone' && 'Will receive SMS invitation'}
                      </p>
                    </div>

                    {participants.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Participants ({participants.length})</Label>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Split between {participants.length + 1} people (including you)
                          </span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {participants.map((participant, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {participant.email && <Mail className="h-4 w-4 text-blue-500" />}
                                  {participant.phone && <Phone className="h-4 w-4 text-green-500" />}
                                  {!participant.email && !participant.phone && <UserIcon className="h-4 w-4 text-gray-500" />}
                                </div>
                                <div>
                                  <span className="font-medium">{participant.name}</span>
                                  {participant.email && <p className="text-xs text-gray-500">{participant.email}</p>}
                                  {participant.phone && <p className="text-xs text-gray-500">{participant.phone}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  ₹{participant.share.toFixed(2)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeParticipant(index)}
                                  className="h-8 w-8 p-0 text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span className="text-purple-600 dark:text-purple-400">₹{Number(amount || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {loading ? 'Creating...' : 'Create Split Expense'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setDescription('');
                          setAmount('');
                          setParticipants([]);
                          setNewParticipant({ name: '', email: '', phone: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Split Expenses List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {splitExpenses.map((expense, index) => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              const isPaidBy = expense.paidBy?._id === user.id || expense.paidBy?._id === user._id;
              
              return (
                <motion.div
                  key={expense._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all shadow-xl hover:shadow-2xl">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">
                            {expense.description}
                          </CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Paid by: {expense.paidBy?.name || 'Unknown'}
                          </p>
                          {expense.paidBy?.paymentDetails?.upiId && expense.paidBy?.paymentDetails?.showPaymentDetails && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                              💳 UPI: {expense.paidBy.paymentDetails.upiId}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {isPaidBy && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense._id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          ₹{expense.amount.toLocaleString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Participants</span>
                          <span className="font-semibold">
                            {expense.participants.filter(p => p.paid).length}/{expense.participants.length} paid
                          </span>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {expense.participants.map((participant, idx) => {
                            const remaining = participant.share - (participant.paidAmount || 0);
                            const canSendReminder = participant.user?.status && ['ACTIVE', 'INVITED'].includes(participant.user.status);
                            
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg ${
                                  participant.paid
                                    ? 'bg-green-50 dark:bg-green-900/30'
                                    : 'bg-gray-50 dark:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {participant.paid ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-gray-400" />
                                    )}
                                    <span className={participant.paid ? 'line-through text-gray-500' : 'font-medium'}>
                                      {participant.name || participant.user?.name}
                                    </span>
                                    {participant.user?.status === 'INVITED' && (
                                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Invited</span>
                                    )}
                                    {participant.user?.status === 'GUEST' && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Guest</span>
                                    )}
                                  </div>
                                  <span className={`font-semibold ${participant.paid ? 'text-green-600' : 'text-purple-600'}`}>
                                    ₹{participant.share.toFixed(2)}
                                  </span>
                                </div>
                                {!participant.paid && remaining > 0 && isPaidBy && (
                                  <div className="flex gap-2 mt-2">
                                    <Input
                                      type="number"
                                      placeholder="Amount"
                                      defaultValue={remaining}
                                      className="flex-1 h-8 text-sm"
                                      id={`payment-amount-${expense._id}-${participant._id || idx}`}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          const amount = e.target.value || remaining;
                                          const participantId = participant._id?.toString() || participant._id;
                                          handlePayment(expense._id, participantId, amount);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const inputId = `payment-amount-${expense._id}-${participant._id || idx}`;
                                        const input = document.getElementById(inputId);
                                        const amount = input?.value || remaining;
                                        const participantId = participant._id?.toString() || participant._id;
                                        handlePayment(expense._id, participantId, amount);
                                      }}
                                      className="h-8"
                                    >
                                      Pay
                                    </Button>
                                    {canSendReminder && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => sendReminder(expense._id, participant._id || idx)}
                                          className="h-8"
                                          title="Send reminder"
                                        >
                                          <Send className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => generatePaymentLink(expense._id, participant._id || idx)}
                                          className="h-8"
                                          title="Generate payment link"
                                        >
                                          <LinkIcon className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                                {participant.paidAmount > 0 && participant.paidAmount < participant.share && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Paid: ₹{participant.paidAmount.toFixed(2)} / Remaining: ₹{remaining.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {expense.settled && (
                          <div className="pt-2 border-t border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="font-semibold">All settled!</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {splitExpenses.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Users className="h-24 w-24 mx-auto mb-6 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No split expenses yet</h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Create your first split expense to get started!</p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Split Expense
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SplitExpenseForm;
