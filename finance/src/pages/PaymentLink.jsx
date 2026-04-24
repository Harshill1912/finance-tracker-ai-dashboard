import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Phone, Copy, Check, QrCode, Building2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const PaymentLink = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [upiOpened, setUpiOpened] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPaymentLink();
    } else {
      setError('Invalid payment link');
      setLoading(false);
    }
  }, [token]);

  // Auto-open UPI payment if UPI ID is available
  useEffect(() => {
    if (paymentData && paymentData.upiDeepLink && paymentData.toUser.upiId && !upiOpened) {
      // Show notification first
      toast.info('Opening UPI payment app...', {
        description: 'Your UPI app will open automatically in a moment',
        duration: 2000
      });

      // Small delay to show the page first, then auto-open UPI
      const timer = setTimeout(() => {
        console.log('🚀 Auto-opening UPI payment:', paymentData.upiDeepLink);
        setUpiOpened(true);
        
        // Try multiple methods to open UPI deep link
        try {
          // Method 1: Try window.location (works on mobile browsers)
          window.location.href = paymentData.upiDeepLink;
          
          // Method 2: Try window.open as fallback (for desktop)
          setTimeout(() => {
            const opened = window.open(paymentData.upiDeepLink, '_blank');
            if (!opened) {
              // If popup blocked, try creating a temporary link and clicking it
              const link = document.createElement('a');
              link.href = paymentData.upiDeepLink;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }, 100);
        } catch (error) {
          console.error('Error opening UPI link:', error);
          toast.error('Could not open UPI app. Please click the button below.');
        }
      }, 1500); // 1.5 second delay to show the page and notification

      return () => clearTimeout(timer);
    }
  }, [paymentData, upiOpened]);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchPaymentLink = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const res = await axios.get(`${baseUrl}/api/simple-payments/link/${token}`);

      if (res.data.success) {
        setPaymentData(res.data.data);
      } else {
        setError(res.data.message || 'Payment link not found');
      }
    } catch (error) {
      console.error('Error fetching payment link:', error);
      setError('Unable to load payment details');
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenUPI = (upiDeepLink) => {
    if (!upiDeepLink) {
      toast.error('UPI link not available');
      return;
    }
    
    console.log('💳 Opening UPI payment:', upiDeepLink);
    setUpiOpened(true);
    
    try {
      // Method 1: Try window.location (works best on mobile browsers)
      window.location.href = upiDeepLink;
      
      // Method 2: Try window.open as fallback (for desktop)
      setTimeout(() => {
        try {
          const opened = window.open(upiDeepLink, '_blank');
          if (!opened) {
            // If popup blocked, try creating a temporary link and clicking it
            const link = document.createElement('a');
            link.href = upiDeepLink;
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
            }, 100);
          }
        } catch (e) {
          console.error('Fallback UPI open failed:', e);
        }
      }, 100);
    } catch (error) {
      console.error('Error opening UPI link:', error);
      toast.error('Could not open UPI app. Please try copying the UPI ID manually.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading payment details...</p>
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
              <h2 className="text-xl font-bold">Error</h2>
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

  if (!paymentData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-center">
              Pay ₹{paymentData.amount.toLocaleString()}
            </CardTitle>
            {paymentData.expense && (
              <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
                For: {paymentData.expense.description}
              </p>
            )}
            {paymentData.upiDeepLink && paymentData.toUser.upiId && !upiOpened && (
              <div className="mt-3 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-700 dark:text-green-300 text-center flex items-center justify-center gap-2">
                  <QrCode className="h-4 w-4 animate-pulse" />
                  <span>Opening UPI payment app automatically...</span>
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recipient Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-4 mb-4">
                <User className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pay to</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">{paymentData.toUser.name}</p>
                </div>
              </div>
              {paymentData.toUser.email && (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {paymentData.toUser.email}
                </p>
              )}
              {paymentData.toUser.phone && (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {paymentData.toUser.phone}
                </p>
              )}
            </div>

            {/* UPI Payment */}
            {paymentData.upiDeepLink && paymentData.toUser.upiId && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-2 border-green-300 dark:border-green-600 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-6 w-6 text-green-600" />
                    <h4 className="font-semibold text-gray-800 dark:text-white">
                      {upiOpened ? 'UPI Payment' : 'UPI Payment (Auto-Opening...)'}
                    </h4>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(paymentData.toUser.upiId, 'upi')}
                  >
                    {copiedField === 'upi' ? (
                      <>
                        <Check className="h-4 w-4 text-green-600 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy UPI
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Auto-open notification */}
                {upiOpened && (
                  <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg mb-4 border border-green-200 dark:border-green-700">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>UPI payment app should open automatically. If not, click the button below.</span>
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">UPI ID</p>
                  <p className="font-mono text-xl font-bold text-gray-800 dark:text-white break-all">
                    {paymentData.toUser.upiId}
                  </p>
                </div>
                
                {/* Direct UPI Link Button - Most Reliable Method */}
                <Button
                  onClick={() => {
                    console.log('🔗 UPI link clicked:', paymentData.upiDeepLink);
                    setUpiOpened(true);
                    handleOpenUPI(paymentData.upiDeepLink);
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg py-6 shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  💳 Pay ₹{paymentData.amount.toFixed(2)} via UPI
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                {/* Fallback: Direct link for browsers that don't support JavaScript */}
                <a
                  href={paymentData.upiDeepLink}
                  className="block text-center text-sm text-green-600 hover:text-green-700 mt-2 underline"
                  onClick={() => setUpiOpened(true)}
                >
                  Or click here to open UPI app directly
                </a>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  Opens PhonePe, Google Pay, Paytm, or any UPI app
                </p>
              </div>
            )}

            {/* Bank Transfer */}
            {paymentData.toUser.bankAccount && paymentData.toUser.bankIFSC && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-6 w-6 text-green-600" />
                  <h4 className="font-semibold text-gray-800 dark:text-white">Bank Transfer</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Number</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-lg font-bold text-gray-800 dark:text-white">
                        {paymentData.toUser.bankAccount}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.toUser.bankAccount, 'account')}
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
                        {paymentData.toUser.bankIFSC}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.toUser.bankIFSC, 'ifsc')}
                      >
                        {copiedField === 'ifsc' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {paymentData.toUser.bankName && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bank Name</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{paymentData.toUser.bankName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">💡 Payment Instructions:</p>
              <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                {paymentData.upiDeepLink && paymentData.toUser.upiId ? (
                  <>
                    <li>UPI payment app will open automatically (or click "Pay via UPI" button)</li>
                    <li>Complete payment in your UPI app (PhonePe, Google Pay, Paytm)</li>
                    <li>After payment, log in and confirm the payment to update your balance</li>
                  </>
                ) : (
                  <>
                    <li>Copy payment details (UPI ID or Bank details) above</li>
                    <li>Complete payment using your UPI app or bank transfer</li>
                    <li>After payment, log in and confirm the payment to update your balance</li>
                  </>
                )}
              </ol>
            </div>

            {/* Login Prompt */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Already paid? Log in to confirm payment
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Log In to Confirm Payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentLink;
