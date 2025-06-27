import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [lastLogin, setLastLogin] = useState(null);
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Get last login date from localStorage
      const storedLastLogin = localStorage.getItem('lastLogin');
      if (storedLastLogin) {
        setLastLogin(storedLastLogin);
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastLogin');
    navigate('/login');
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    setPasswordError('');
    console.log('Password updated!');
    // Make the API call here to update the password
  };

  const handleEmailChange = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    console.log('Email updated!');
    // Make the API call here to update the email
  };

  const updateLastLogin = () => {
    const currentDate = new Date().toLocaleString();
    localStorage.setItem('lastLogin', currentDate);
    setLastLogin(currentDate);
  };

  useEffect(() => {
    updateLastLogin();
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <img
            src="https://via.placeholder.com/150"
            alt="Profile"
            className="w-32 h-32 rounded-full border-4 border-blue-600"
          />
        </div>

        <h2 className="text-3xl font-semibold text-center mb-4 text-gray-800">Welcome, {user.name}</h2>
        <p className="text-lg mb-4 text-center text-gray-600">
          <strong>Email:</strong> {user.email}
        </p>

        {lastLogin && (
          <p className="text-sm text-center text-gray-500 mb-6">
            <strong>Last Login:</strong> {lastLogin}
          </p>
        )}

        {/* Buttons to change Email or Password */}
        <div className="flex justify-between mb-6">
          <button
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
          >
            Change Email
          </button>

          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
          >
            Change Password
          </button>
        </div>

        {/* Change Email Form */}
        {showEmailForm && (
          <div className="mt-4">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Change Email</h3>
            <div className="mb-4">
              <label className="block text-gray-700" htmlFor="newEmail">New Email</label>
              <input
                type="email"
                id="newEmail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new email"
              />
            </div>

            {emailError && <p className="text-red-500 text-sm">{emailError}</p>}

            <button
              onClick={handleEmailChange}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Change Email
            </button>
          </div>
        )}

        {/* Change Password Form */}
        {showPasswordForm && (
          <div className="mt-4">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Change Password</h3>
            <div className="mb-4">
              <label className="block text-gray-700" htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700" htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}

            <button
              onClick={handlePasswordChange}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Change Password
            </button>
          </div>
        )}

        {/* Logout Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-3 px-6 rounded-lg hover:bg-red-600 transition duration-300"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
