import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, Mail, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const InvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const expenseId = searchParams.get('expense');
  const token = searchParams.get('token');

  useEffect(() => {
    if (expenseId) {
      fetchExpenseDetails();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [expenseId]);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchExpenseDetails = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/splits/invitation/${expenseId}`, {
        params: { token }
      });

      if (res.data.success) {
        setExpense(res.data.data);
        
        // Store invitation user info (email/phone) for pre-filling signup form
        if (res.data.data.invitationUser) {
          const invitationData = {
            expenseId,
            token,
            email: res.data.data.invitationUser.email,
            phone: res.data.data.invitationUser.phone,
            name: res.data.data.invitationUser.name
          };
          localStorage.setItem('pendingInvitation', JSON.stringify(invitationData));
        } else {
          // Still store basic invitation info even if user not found
          localStorage.setItem('pendingInvitation', JSON.stringify({
            expenseId,
            token
          }));
        }
      } else {
        setError(res.data.message || 'Expense not found');
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      setError('Unable to load expense details');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Invitation info already stored in fetchExpenseDetails
    // Check if user is logged in
    const userToken = localStorage.getItem('token');
    if (userToken) {
      // User is logged in, redirect to split expenses
      navigate('/splitexpenses');
    } else {
      // User not logged in, redirect to signup with invitation info
      navigate('/signup?invitation=true');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Invalid Invitation</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Link to="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expense) {
    return null;
  }

  const userShare = expense.participants?.find(p => 
    (p.email && token) || (p.phone && token)
  ) || expense.participants?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            You've been invited to a split expense!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Expense Details */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                {expense.description}
              </h3>
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ₹{expense.amount.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="h-5 w-5" />
                <span>Paid by: <strong>{expense.paidBy?.name || 'Unknown'}</strong></span>
              </div>
              {userShare && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Your Share</p>
                      <p className="text-xl font-bold text-gray-800 dark:text-white">
                        ₹{userShare.share?.toFixed(2) || expense.amount / (expense.participants?.length + 1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total People</p>
                      <p className="text-xl font-bold text-gray-800 dark:text-white">
                        {expense.participants?.length + 1 || 1}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>{expense.paidBy?.name}</strong> has added you to this expense. 
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {expense.invitationUser ? (
                  <>
                    You'll be able to sign up with your {expense.invitationUser.email ? 'email' : 'phone'} ({expense.invitationUser.email || expense.invitationUser.phone}) 
                    to join this expense group and settle your share.
                  </>
                ) : (
                  'Sign up or log in to view and settle this expense.'
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleContinue}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                size="lg"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationPage;
