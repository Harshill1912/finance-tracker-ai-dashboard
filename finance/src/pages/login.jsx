import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, KeyRound, LogIn, AlertCircle, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // If logged in, navigate to dashboard
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields");
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
        `${baseUrl}/api/auth/login`,
        {
          email,
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
        
        // Check if there's a pending invitation
        const pendingInvitation = localStorage.getItem('pendingInvitation');
        if (pendingInvitation) {
          toast.success("Welcome back! Redirecting to expense...");
          localStorage.removeItem('pendingInvitation');
          navigate("/splitexpenses");
        } else {
          // Check if user was INVITED and now logging in - they should see their expenses
          navigate("/splitexpenses");
          toast.success("Welcome back! 🎉");
          navigate("/dashboard");
        }
        setLoading(false);
      } else {
        setError("Login failed. Token not received.");
        toast.error("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = "Request timed out. Please check your connection.";
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMessage = "Network error. Please check if the server is running.";
      } else if (error.response) {
        errorMessage = error.response.data?.message || "Login failed. Please check your credentials.";
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
        toast.success("Welcome! 🎉");
        navigate("/dashboard");
      } else {
        setError("Login failed. Token not received.");
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      console.error('Google login error:', error);
      
      let errorMessage = "Google login failed. Please try again.";
      
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
    toast.error("Google login failed. Please try again.");
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <Card className="overflow-hidden shadow-2xl border-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Side - Branding */}
            <div className="hidden md:flex bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white p-12 flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h1 className="text-3xl font-bold">FinancePro AI</h1>
                </div>
                <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                  Secure your financial future with AI-powered insights and smart money management
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white/20 p-2 rounded-lg mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">AI-Powered Analytics</h3>
                      <p className="text-sm text-blue-100">Get intelligent insights into your spending patterns</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white/20 p-2 rounded-lg mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Bank-Level Security</h3>
                      <p className="text-sm text-blue-100">Your data is encrypted and secure</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white/20 p-2 rounded-lg mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Real-Time Tracking</h3>
                      <p className="text-sm text-blue-100">Monitor your finances instantly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="p-8 md:p-12 bg-white dark:bg-gray-800">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h2>
                  <p className="text-gray-500 dark:text-gray-400">Sign in to continue to your account</p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top">
                    <AlertCircle size={16} />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Google Login */}
                {googleClientId ? (
                  <div className="space-y-4">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap={false}
                      use_fedcm_for_prompt={false}
                      theme="outline"
                      size="large"
                      text="signin_with"
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
                ) : (
                  <div className="text-xs text-gray-400 text-center py-2">
                    Google login will be available after configuration
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                        Password
                      </Label>
                      <Link 
                        to="/forgot-password" 
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all" 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn size={18} />
                        <span>Sign In</span>
                      </div>
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Don't have an account?{" "}
                    <Link 
                      to="/signup" 
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Create account
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

export default Login;
