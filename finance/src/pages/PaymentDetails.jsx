import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Building2, Smartphone, Eye, EyeOff, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

const PaymentDetails = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: '',
    bankAccountNumber: '',
    bankIFSC: '',
    bankName: '',
    accountHolderName: '',
    preferredPaymentMethod: 'NONE',
    showPaymentDetails: false
  });
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
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

  const fetchPaymentDetails = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${baseUrl}/api/payment-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success && res.data.data.paymentDetails) {
        setPaymentDetails({
          upiId: res.data.data.paymentDetails.upiId || '',
          bankAccountNumber: res.data.data.paymentDetails.bankAccountNumber || '',
          bankIFSC: res.data.data.paymentDetails.bankIFSC || '',
          bankName: res.data.data.paymentDetails.bankName || '',
          accountHolderName: res.data.data.paymentDetails.accountHolderName || '',
          preferredPaymentMethod: res.data.data.paymentDetails.preferredPaymentMethod || 'NONE',
          showPaymentDetails: res.data.data.paymentDetails.showPaymentDetails || false
        });
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const baseUrl = await getBaseUrl();
      const token = localStorage.getItem('token');

      // Validation
      if (paymentDetails.preferredPaymentMethod === 'UPI' && !paymentDetails.upiId) {
        toast.error('Please enter UPI ID');
        setSaving(false);
        return;
      }

      if ((paymentDetails.preferredPaymentMethod === 'BANK_TRANSFER' || paymentDetails.preferredPaymentMethod === 'BOTH') 
          && (!paymentDetails.bankAccountNumber || !paymentDetails.bankIFSC)) {
        toast.error('Please enter bank account number and IFSC code');
        setSaving(false);
        return;
      }

      const res = await axios.put(`${baseUrl}/api/payment-details`, paymentDetails, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success('Payment details saved successfully! 💳');
      }
    } catch (error) {
      console.error('Error saving payment details:', error);
      toast.error('Failed to save payment details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-purple-600" />
              Payment Details
            </CardTitle>
            <p className="text-gray-600 mt-2">Manage your payment information for receiving payments</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* UPI Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                <Smartphone className="h-5 w-5 text-purple-600" />
                UPI Payment Details
              </div>
              
              <div>
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  type="text"
                  placeholder="yourname@upi"
                  value={paymentDetails.upiId}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">Your UPI ID (e.g., yourname@paytm, yourname@ybl)</p>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                <Building2 className="h-5 w-5 text-blue-600" />
                Bank Account Details
              </div>
              
              <div>
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  type="text"
                  placeholder="Your Full Name"
                  value={paymentDetails.accountHolderName}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, accountHolderName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <div className="relative">
                  <Input
                    id="bankAccountNumber"
                    type={showAccountNumber ? 'text' : 'password'}
                    placeholder="Enter account number"
                    value={paymentDetails.bankAccountNumber}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, bankAccountNumber: e.target.value })}
                    className="mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showAccountNumber ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankIFSC">IFSC Code</Label>
                  <Input
                    id="bankIFSC"
                    type="text"
                    placeholder="BANK0001234"
                    value={paymentDetails.bankIFSC}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, bankIFSC: e.target.value.toUpperCase() })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    type="text"
                    placeholder="Bank Name"
                    value={paymentDetails.bankName}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, bankName: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Payment Preferences */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Payment Preferences
              </div>

              <div>
                <Label htmlFor="preferredPaymentMethod">Preferred Payment Method</Label>
                <select
                  id="preferredPaymentMethod"
                  value={paymentDetails.preferredPaymentMethod}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, preferredPaymentMethod: e.target.value })}
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="NONE">None</option>
                  <option value="UPI">UPI Only</option>
                  <option value="BANK_TRANSFER">Bank Transfer Only</option>
                  <option value="BOTH">Both UPI & Bank Transfer</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">Choose how you want to receive payments</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showPaymentDetails"
                  checked={paymentDetails.showPaymentDetails}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, showPaymentDetails: e.target.checked })}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <Label htmlFor="showPaymentDetails" className="cursor-pointer">
                  Share payment details in expense invitations
                </Label>
              </div>
              <p className="text-sm text-gray-500 ml-8">
                When enabled, your UPI ID and bank details will be included in invitation emails/SMS
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Payment Details
                  </>
                )}
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Security Note:</p>
                <p>Your payment details are stored securely and only shared with users you invite to expenses (if enabled). 
                We never share your bank account number or IFSC code publicly.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentDetails;
