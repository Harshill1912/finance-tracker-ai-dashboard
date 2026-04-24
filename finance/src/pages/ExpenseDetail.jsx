import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Users, Mail, Phone, ArrowRight, AlertCircle, CheckCircle2, XCircle, User, CreditCard, Copy, Check, Building2, QrCode, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [user, setUser] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    if (id) {
      fetchExpenseDetails();
    } else {
      setError('Invalid expense ID');
      setLoading(false);
    }
  }, [id, navigate]);

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
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();
      
      // Try splitwise API first
      let res;
      try {
        res = await axios.get(`${baseUrl}/api/splitwise/expenses/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Fallback to split expense API
        res = await axios.get(`${baseUrl}/api/splits/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (res.data.success || res.data.data) {
        const expenseData = res.data.data || res.data;
        setExpense(expenseData);
        
        // Find user's participant record
        const userParticipant = expenseData.participants?.find(p => 
          p.user && p.user.toString() === user?.id
        );
        
        if (userParticipant) {
          setPaymentAmount(userParticipant.share?.toString() || '');
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

  const handleGeneratePaymentLink = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!expense || !user) {
      toast.error('Expense or user data not loaded');
      return;
    }

    setGeneratingLink(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();

      // Find the payer (who created the expense)
      const payerId = expense.paidBy?._id || expense.paidBy || expense.user?._id || expense.user;
      
      if (!payerId) {
        toast.error('Unable to find expense creator');
        return;
      }

      // Generate payment link
      const linkRes = await axios.post(
        `${baseUrl}/api/simple-payments/generate-link`,
        {
          amount: Number(paymentAmount),
          expenseId: expense._id,
          toUserId: payerId.toString(),
          description: `Payment for ${expense.description}`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (linkRes.data.success) {
        setPaymentLink(linkRes.data.data);
        toast.success('Payment link generated!');
      } else {
        toast.error(linkRes.data.message || 'Failed to generate payment link');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      toast.error(error.response?.data?.message || 'Failed to generate payment link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleOpenUPI = (upiDeepLink) => {
    if (upiDeepLink) {
      window.location.href = upiDeepLink;
    } else {
      toast.error('UPI link not available');
    }
  };

  const handleConfirmPayment = async (token) => {
    try {
      const tokenAuth = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();

      const confirmRes = await axios.post(
        `${baseUrl}/api/simple-payments/confirm/${token}`,
        {
          paymentMethod: 'UPI',
          notes: notes || 'Payment confirmed'
        },
        {
          headers: { Authorization: `Bearer ${tokenAuth}` }
        }
      );

      if (confirmRes.data.success) {
        toast.success('Payment confirmed successfully!');
        setPaymentLink(null);
        setPaymentAmount('');
        setNotes('');
        await fetchExpenseDetails();
      } else {
        toast.error(confirmRes.data.message || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm payment');
    }
  };

  const handleManualPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!expense || !user) {
      toast.error('Expense or user data not loaded');
      return;
    }

    setProcessingPayment(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = await getBaseUrl();

      // Find the payer (who created the expense)
      const payerId = expense.paidBy?._id || expense.paidBy || expense.user?._id || expense.user;
      
      if (!payerId) {
        toast.error('Unable to find expense creator');
        return;
      }

      // Record payment
      const paymentData = {
        toUser: payerId.toString(),
        amount: Number(paymentAmount),
        groupId: expense.group?._id || expense.group || null,
        expenseId: expense._id,
        paymentMethod,
        notes
      };

      let res;
      try {
        // Try splitwise API first
        res = await axios.post(`${baseUrl}/api/splitwise/payments`, paymentData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Fallback to split expense API
        res = await axios.post(`${baseUrl}/api/splits/payments`, paymentData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (res.data.success) {
        toast.success('Payment recorded successfully!');
        // Refresh expense details
        await fetchExpenseDetails();
        // Clear form
        setPaymentAmount('');
        setNotes('');
      } else {
        toast.error(res.data.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePayment = () => {
    handleManualPayment();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading expense details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" />
                <h2 className="text-xl font-bold">Error</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <div className="flex gap-3">
                <Button onClick={() => navigate('/splitexpenses')} variant="outline" className="flex-1">
                  Go to Split Expenses
                </Button>
                <Link to="/dashboard">
                  <Button className="flex-1">Go to Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!expense) {
    return null;
  }

  // Find user's participant record
  const userParticipant = expense.participants?.find(p => 
    p.user && (p.user._id?.toString() === user?.id || p.user.toString() === user?.id)
  );

  const userShare = userParticipant?.share || 0;
  const userPaid = userParticipant?.paidAmount || 0;
  const userOwed = userShare - userPaid;
  const isFullyPaid = userOwed <= 0;

  const payer = expense.paidBy || expense.user;
  const payerName = payer?.name || 'Unknown';
  const payerEmail = payer?.email || '';
  const payerPhone = payer?.phone || '';
  const paymentDetails = payer?.paymentDetails || {};
  const showPaymentDetails = paymentDetails?.showPaymentDetails !== false; // Default to true if not set

  // Copy to clipboard function
  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Expense Details Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {expense.description}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount and Status */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      ₹{expense.amount?.toLocaleString() || '0'}
                    </p>
                  </div>
                  {isFullyPaid ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-6 w-6" />
                      <span className="font-semibold">Fully Paid</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-6 w-6" />
                      <span className="font-semibold">Pending</span>
                    </div>
                  )}
                </div>

                {/* User's Share */}
                {userParticipant && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Your Share</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">
                          ₹{userShare.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
                        <p className="text-xl font-bold text-green-600">
                          ₹{userPaid.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                        <p className="text-xl font-bold text-orange-600">
                          ₹{userOwed > 0 ? userOwed.toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payer Info */}
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <User className="h-8 w-8 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Paid by</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{payerName}</p>
                  {payerEmail && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {payerEmail}
                    </p>
                  )}
                  {payerPhone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {payerPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Methods - How to Pay */}
              {!isFullyPaid && showPaymentDetails && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
                      <CreditCard className="h-6 w-6" />
                      How to Pay {payerName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* UPI Payment */}
                    {paymentDetails?.upiId && (
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-5 w-5 text-green-600" />
                            <h4 className="font-semibold text-gray-800 dark:text-white">UPI Payment</h4>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(paymentDetails.upiId, 'upi')}
                            className="flex items-center gap-1"
                          >
                            {copiedField === 'upi' ? (
                              <>
                                <Check className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">UPI ID</p>
                          <p className="font-mono text-lg font-bold text-gray-800 dark:text-white break-all">
                            {paymentDetails.upiId}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Send ₹{userOwed > 0 ? userOwed.toFixed(2) : userShare.toFixed(2)} to this UPI ID using PhonePe, Google Pay, Paytm, or any UPI app
                        </p>
                      </div>
                    )}

                    {/* Bank Transfer */}
                    {paymentDetails?.bankAccountNumber && paymentDetails?.bankIFSC && (
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-green-600" />
                            <h4 className="font-semibold text-gray-800 dark:text-white">Bank Transfer</h4>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Number</p>
                            <div className="flex items-center justify-between">
                              <p className="font-mono text-lg font-bold text-gray-800 dark:text-white">
                                {paymentDetails.bankAccountNumber}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(paymentDetails.bankAccountNumber, 'account')}
                              >
                                {copiedField === 'account' ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">IFSC Code</p>
                            <div className="flex items-center justify-between">
                              <p className="font-mono text-lg font-bold text-gray-800 dark:text-white">
                                {paymentDetails.bankIFSC}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(paymentDetails.bankIFSC, 'ifsc')}
                              >
                                {copiedField === 'ifsc' ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {paymentDetails.bankName && (
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Bank Name</p>
                              <p className="font-semibold text-gray-800 dark:text-white">{paymentDetails.bankName}</p>
                            </div>
                          )}
                          {paymentDetails.accountHolderName && (
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Account Holder</p>
                              <p className="font-semibold text-gray-800 dark:text-white">{paymentDetails.accountHolderName}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Transfer ₹{userOwed > 0 ? userOwed.toFixed(2) : userShare.toFixed(2)} using NEFT, RTGS, or IMPS
                        </p>
                      </div>
                    )}

                    {/* No Payment Details */}
                    {!paymentDetails?.upiId && !paymentDetails?.bankAccountNumber && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          Payment details not available. Please contact {payerName} directly via email or phone to arrange payment.
                        </p>
                      </div>
                    )}

                    {/* Payment Instructions */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">💡 Payment Instructions:</p>
                      <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                        <li>Copy the payment details above</li>
                        <li>Open your payment app (PhonePe, Google Pay, Paytm, etc.)</li>
                        <li>Send ₹{userOwed > 0 ? userOwed.toFixed(2) : userShare.toFixed(2)} to {payerName}</li>
                        <li>After payment, record it using the form below to update your balance</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Participants */}
              {expense.participants && expense.participants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participants ({expense.participants.length})
                  </h3>
                  <div className="space-y-2">
                    {expense.participants.map((p, idx) => {
                      const participantName = p.user?.name || p.name || 'Guest';
                      const isPaid = p.paid || (p.paidAmount >= p.share);
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            {isPaid ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-orange-600" />
                            )}
                            <span className="font-medium">{participantName}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{p.share?.toFixed(2) || '0.00'}</p>
                            {p.paidAmount > 0 && (
                              <p className="text-sm text-green-600">Paid: ₹{p.paidAmount.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Form */}
          {!isFullyPaid && userParticipant && !paymentLink && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Pay {payerName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Payment Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Remaining: ₹${userOwed.toFixed(2)}`}
                    max={userOwed}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You owe ₹{userOwed.toFixed(2)} to {payerName}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleGeneratePaymentLink}
                    disabled={generatingLink || !paymentAmount || Number(paymentAmount) <= 0}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="lg"
                  >
                    {generatingLink ? 'Generating...' : '📱 Get Payment Link'}
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={processingPayment || !paymentAmount || Number(paymentAmount) <= 0}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    {processingPayment ? 'Processing...' : '✓ Record Payment'}
                  </Button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    <strong>💡 Quick Pay:</strong> Generate a payment link to pay via UPI or record payment manually after paying.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Link Display */}
          {paymentLink && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
                  <LinkIcon className="h-6 w-6" />
                  Payment Link Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment Link</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={paymentLink.paymentLink}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(paymentLink.paymentLink, 'link')}
                    >
                      {copiedField === 'link' ? (
                        <>
                          <Check className="h-4 w-4 text-green-600 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {paymentLink.upiDeepLink && (
                  <Button
                    onClick={() => handleOpenUPI(paymentLink.upiDeepLink)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="lg"
                  >
                    💳 Pay ₹{paymentAmount || userOwed.toFixed(2)} via UPI
                  </Button>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2">
                    <strong>📋 Steps:</strong>
                  </p>
                  <ol className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
                    <li>Click "Pay via UPI" button above (if available) or copy payment details</li>
                    <li>Complete payment using your UPI app or bank transfer</li>
                    <li>Come back and click "Confirm Payment" below</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleConfirmPayment(paymentLink.paymentToken)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="lg"
                  >
                    ✓ Confirm Payment
                  </Button>
                  <Button
                    onClick={() => setPaymentLink(null)}
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already Paid Message */}
          {isFullyPaid && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-800 dark:text-green-400 mb-2">
                  Payment Complete!
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  You have fully paid your share of ₹{userShare.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="mt-6">
            <Button
              onClick={() => navigate('/splitexpenses')}
              variant="outline"
              className="w-full"
            >
              Back to Split Expenses
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;
