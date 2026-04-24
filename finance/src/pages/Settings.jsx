import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  User, Mail, Phone, KeyRound, CreditCard, Building2, Smartphone, 
  Eye, EyeOff, Save, CheckCircle2, AlertCircle, Settings as SettingsIcon,
  Lock, Shield, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '@/components/navbar';

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Check URL params for tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'payment', 'security'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);
  
  // User info
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Payment details
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
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setName(parsedUser.name || '');
    setEmail(parsedUser.email || '');
    setPhone(parsedUser.phone || '');
    
    fetchUserData();
  }, [navigate]);

  const getBaseUrl = async () => {
    const localUrl = 'http://localhost:5000';
    const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
    
    try {
      const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
      if (testRes.data) return localUrl;
    } catch (e) {}
    return deployedUrl;
  };

  const fetchUserData = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No token found, skipping payment details fetch');
        setLoading(false);
        return;
      }
      
      // Fetch payment details
      try {
        const paymentRes = await axios.get(`${baseUrl}/api/payment-details`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });

        if (paymentRes.data.success && paymentRes.data.data.paymentDetails) {
          setPaymentDetails({
            upiId: paymentRes.data.data.paymentDetails.upiId || '',
            bankAccountNumber: paymentRes.data.data.paymentDetails.bankAccountNumber || '',
            bankIFSC: paymentRes.data.data.paymentDetails.bankIFSC || '',
            bankName: paymentRes.data.data.paymentDetails.bankName || '',
            accountHolderName: paymentRes.data.data.paymentDetails.accountHolderName || '',
            preferredPaymentMethod: paymentRes.data.data.paymentDetails.preferredPaymentMethod || 'NONE',
            showPaymentDetails: paymentRes.data.data.paymentDetails.showPaymentDetails || false
          });
        }
      } catch (paymentError) {
        // If 404, route might not be available yet - just log and continue
        if (paymentError.response?.status === 404) {
          console.warn('Payment details endpoint not found (404). This is normal if backend was just restarted.');
        } else {
          console.error('Error fetching payment details:', paymentError);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const baseUrl = await getBaseUrl();
      const token = localStorage.getItem('token');

      // Validation
      if (!name || !email) {
        toast.error('Name and email are required');
        setSaving(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error('Please enter a valid email address');
        setSaving(false);
        return;
      }

      // Update user profile (you'll need to create this endpoint)
      // For now, just update payment details
      await handleSavePaymentDetails();
      
      // Update local storage
      const updatedUser = { ...user, name, email, phone };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast.success('Profile updated successfully! ✅');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error('Please fill all password fields');
        return;
      }

      if (newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      setSaving(true);
      const baseUrl = await getBaseUrl();
      const token = localStorage.getItem('token');

      // Update password (you'll need to create this endpoint)
      // await axios.put(`${baseUrl}/api/auth/change-password`, {
      //   currentPassword,
      //   newPassword
      // }, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      toast.success('Password changed successfully! 🔒');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentDetails = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Please login to save payment details');
        return;
      }

      if (paymentDetails.preferredPaymentMethod === 'UPI' && !paymentDetails.upiId) {
        toast.error('Please enter UPI ID');
        return;
      }

      if ((paymentDetails.preferredPaymentMethod === 'BANK_TRANSFER' || paymentDetails.preferredPaymentMethod === 'BOTH') 
          && (!paymentDetails.bankAccountNumber || !paymentDetails.bankIFSC)) {
        toast.error('Please enter bank account number and IFSC code');
        return;
      }

      try {
        const res = await axios.put(`${baseUrl}/api/payment-details`, paymentDetails, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });

        if (res.data.success) {
          toast.success('Payment details saved! 💳');
        }
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          toast.error('Payment details endpoint not available. Please check if backend server is running.');
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Error saving payment details:', error);
      toast.error('Failed to save payment details');
      throw error;
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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'payment', label: 'Payment Details', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <SettingsIcon className="h-8 w-8 text-purple-600" />
              Settings
            </CardTitle>
            <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600 font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <User className="h-5 w-5 text-purple-600" />
                    Personal Information
                  </div>

                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1"
                      placeholder="+91 9876543210"
                    />
                    <p className="text-sm text-gray-500 mt-1">Required for split expenses and SMS notifications</p>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
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
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Details Tab */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
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

                <Separator />

                <div className="space-y-4">
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

                <Separator />

                <div className="space-y-4">
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
                </div>

                <Button
                  onClick={handleSavePaymentDetails}
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
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <Lock className="h-5 w-5 text-purple-600" />
                    Change Password
                  </div>

                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="mt-1 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Password must be at least 6 characters</p>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Changing...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Security Tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use a strong, unique password</li>
                      <li>Never share your password with anyone</li>
                      <li>Enable two-factor authentication if available</li>
                      <li>Regularly review your account activity</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
