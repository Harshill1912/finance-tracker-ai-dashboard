import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, User, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';

const Signup = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check for pending invitation and pre-fill email/phone
  useEffect(() => {
    const pendingInvitation = localStorage.getItem('pendingInvitation');
    if (pendingInvitation) {
      try {
        const invitation = JSON.parse(pendingInvitation);
        // Pre-fill email and phone from invitation if available
        if (invitation.email && !email) {
          setEmail(invitation.email);
        }
        if (invitation.phone && !phone) {
          setPhone(invitation.phone);
        }
        if (invitation.name && !name) {
          setName(invitation.name);
        }
      } catch (error) {
        console.error('Error parsing invitation data:', error);
      }
    }
  }, []);

  const validatePassword = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength++;
    if (pwd.match(/\d/)) strength++;
    if (pwd.match(/[^a-zA-Z\d]/)) strength++;
    return strength;
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setPasswordStrength(validatePassword(pwd));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-200';
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength === 3) return 'Medium';
    return 'Strong';
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Use local backend if available, otherwise use deployed
      const localUrl = 'http://localhost:5000';
      const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
      
      // Check if local backend is available first (quick check)
      let useLocal = false;
      try {
        const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
        if (testRes.data) {
          useLocal = true;
        }
      } catch (e) {
        // Local not available, use deployed
        useLocal = false;
      }
      
      const baseUrl = useLocal ? localUrl : deployedUrl;
      const timeout = useLocal ? 8000 : 20000; // Longer timeout for deployed
      
      const res = await axios.post(
        `${baseUrl}/api/auth/signup`,
        {
          email,
          name,
          phone: phone || undefined,
          password,
        },
        {
          timeout: timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.data && res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        
        // Check if user was invited
        const pendingInvitation = localStorage.getItem('pendingInvitation');
        if (pendingInvitation || res.data.invited) {
          toast.success("Account created! Redirecting to expense...");
          localStorage.removeItem('pendingInvitation');
          navigate("/splitexpenses");
        } else {
          toast.success("Account created successfully! 🎉");
          // Check if phone or payment details are missing - redirect to settings
          if (!phone) {
            toast.info("Complete your profile in Settings to enable all features");
            setTimeout(() => {
              navigate("/settings?tab=profile");
            }, 1500);
          } else {
            navigate("/dashboard");
          }
        }
        setLoading(false);
      } else {
        setError("Signup failed. Token not received.");
        toast.error("Signup failed. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      let errorMessage = "Signup failed. Please try again.";
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMessage = "Network error. Please check if the server is running.";
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No response from server. Please check if the backend is running.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError("");
      
      // Use local backend if available, otherwise use deployed
      const localUrl = 'http://localhost:5000';
      const deployedUrl = import.meta.env.VITE_API_URL || 'https://finance-tracker-ai-dashboard.onrender.com';
      
      // Check if local backend is available first
      let useLocal = false;
      try {
        const testRes = await axios.get(`${localUrl}/api/test`, { timeout: 2000 });
        if (testRes.data) {
          useLocal = true;
        }
      } catch (e) {
        // Local not available, use deployed
        useLocal = false;
      }
      
      const baseUrl = useLocal ? localUrl : deployedUrl;
      const timeout = useLocal ? 8000 : 20000;
      
      const res = await axios.post(
        `${baseUrl}/api/auth/google`,
        {
          credential: credentialResponse.credential,
        },
        {
          timeout: timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success("Account created successfully! 🎉");
        navigate("/dashboard");
      } else {
        setError("Signup failed. Token not received.");
        toast.error("Signup failed. Please try again.");
      }
    } catch (error) {
      console.error('Google signup error:', error);
      
      let errorMessage = "Google signup failed. Please try again.";
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMessage = "Network error. Please check if the server is running.";
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No response from server. Please check if the backend is running.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google signup failed. Please try again.");
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <Card className="overflow-hidden shadow-2xl border-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Side - Branding */}
            <div className="hidden md:flex bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white p-12 flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h1 className="text-3xl font-bold">FinancePro AI</h1>
                </div>
                <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                  Start your journey to financial freedom with AI-powered insights and smart budgeting
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white/20 p-2 rounded-lg mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Smart Budgeting</h3>
                      <p className="text-sm text-blue-100">AI-powered budget recommendations</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white/20 p-2 rounded-lg mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Track Everything</h3>
                      <p className="text-sm text-blue-100">Monitor expenses and investments</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white/20 p-2 rounded-lg mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Secure & Private</h3>
                      <p className="text-sm text-blue-100">Your data is always protected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Signup Form */}
            <div className="p-8 md:p-12 bg-white dark:bg-gray-800">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
                  <p className="text-gray-500 dark:text-gray-400">Sign up to get started with FinancePro AI</p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top">
                    <AlertCircle size={16} />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Google Signup */}
                {googleClientId ? (
                  <div className="space-y-4">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap={false}
                      use_fedcm_for_prompt={false}
                      theme="outline"
                      size="large"
                      text="signup_with"
                      shape="rectangular"
                      auto_select={false}
                    />
                    <div className="relative">
                      <Separator />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white dark:bg-gray-800 px-4 text-gray-500 dark:text-gray-400 text-sm">OR</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
                      Phone Number <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">(Recommended)</span>
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                      Required for split expenses and SMS notifications. You can add it later in Settings.
                    </p>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Required for split expenses and SMS notifications. You can add it later in Settings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                      Password
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={handlePasswordChange}
                        className="pl-10 pr-10 h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {password && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${getPasswordStrengthColor()}`}
                              style={{ width: `${(passwordStrength / 4) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getPasswordStrengthText()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Use 8+ characters with uppercase, lowercase, numbers, and symbols
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {confirmPassword && password && (
                      <div className="flex items-center gap-2 text-sm">
                        {password === confirmPassword ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">Passwords match</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600 dark:text-red-400">Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all" 
                    disabled={loading || password !== confirmPassword}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    By signing up, you agree to our{" "}
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>
                  </p>
                </div>

                <div className="text-center pt-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    Already have an account?{" "}
                    <Link 
                      to="/login" 
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
