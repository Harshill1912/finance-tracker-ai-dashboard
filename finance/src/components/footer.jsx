import Home from '@/pages/Home'
import React from 'react'

import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 mt-6">
    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Left Section - About */}
      <div>
        <h2 className="text-xl font-bold text-white">AI Finance</h2>
        <p className="mt-2 text-gray-400">
          Manage your expenses effortlessly with AI-powered insights and smart tracking.
        </p>
      </div>

      {/* Middle Section - Quick Links */}
      <div>
        <h2 className="text-lg font-bold text-white">Quick Links</h2>
        <ul className="mt-2 space-y-2">
          <li>
            <a href="#" className="hover:text-white transition duration-300">Home</a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition duration-300">Features</a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition duration-300">Pricing</a>
          </li>
          <li>
            <a href="#" className="hover:text-white transition duration-300">Contact</a>
          </li>
        </ul>
      </div>

      {/* Right Section - Contact & Socials */}
      <div>
        <h2 className="text-lg font-bold text-white">Contact</h2>
        <p className="mt-2 text-gray-400">📍Ahmedabad, India</p>
        <p className="text-gray-400">📧 support@aifinance.com</p>
        <div className="flex space-x-4 mt-4">
          <a href="#" className="hover:text-white transition duration-300">🔵 Facebook</a>
          <a href="#" className="hover:text-white transition duration-300">🔷 Twitter</a>
          <a href="#" className="hover:text-white transition duration-300">📸 Instagram</a>
        </div>
      </div>

    </div>

    {/* Copyright Section */}
    <div className="border-t border-gray-700 mt-6 pt-4 text-center text-gray-500">
      © 2024 AI Finance. All rights reserved.
    </div>
  </footer>
  )
}

export default Footer