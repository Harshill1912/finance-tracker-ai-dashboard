import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, KeyRound, LogIn, AlertCircle } from "lucide-react";

import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      if (res.data.token) {
        // Save token and user info in localStorage
        localStorage.setItem("token", res.data.token);
        console.log(res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        console.log(res.data.user);
        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        setError("Login failed. Token not received.");
      }
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden shadow-xl">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="hidden md:block bg-gradient-to-br from-primary to-blue-700 text-white p-12 flex flex-col justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">AI Finance</h1>
                <p className="text-blue-100 mb-8">Secure your financial future with AI-powered insights</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-full mt-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Smart Analytics</h3>
                    <p className="text-sm text-blue-100">Get insights into your spending habits</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-full mt-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Secure Platform</h3>
                    <p className="text-sm text-blue-100">Bank-level security for your data</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">Welcome Back</h2>
                  <p className="text-gray-500">Sign in to access your account</p>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail size={16} />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <KeyRound size={16} />
                        Password
                      </Label>
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Logging in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn size={16} />
                        <span>Sign in</span>
                      </div>
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-2 text-gray-500 text-sm">OR</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-600">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-primary font-medium hover:underline">
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
