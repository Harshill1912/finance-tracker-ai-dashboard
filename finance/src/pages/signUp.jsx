import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup", {
        email,
        name,
        password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Signup Failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-2">
        {/* Image Section */}
        <img
          src="login.png"
          alt="Signup"
          className="hidden md:block w-full h-full object-cover"
        />

        {/* Signup Form */}
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Create an Account</h2>
          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className=" text-black w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className=" text-black w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="text-black w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Sign Up
            </button>a
          </form>
          <p className="text-sm mt-4 text-gray-500 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
          <p className="text-xs text-gray-400 text-center mt-4">
            By signing up, you agree to our{" "}
            <a href="#" className="underline">Terms</a> and{" "}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
