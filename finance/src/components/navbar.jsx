import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Menu, X, Sun, Moon, LogIn, UserPlus, User, BarChart4 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const savedTheme = Cookies.get("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }

    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [location]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    Cookies.set("theme", newMode ? "dark" : "light", { expires: 365 });

    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white text-gray-800 w-full shadow-md border-b border-gray-200 ">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="text-xl font-bold flex items-center">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <BarChart4 className="text-blue-600" />
              <span className="text-gray-800 hover:text-blue-700 transition-colors">
                Finance Beacon
              </span>
            </Link>
          </div>

          {/* Mobile menu */}
          <div className="sm:hidden flex items-center gap-3">
            <button 
              onClick={toggleDarkMode} 
              className="text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-full"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-full"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop menu */}
          <ul className="hidden sm:flex space-x-4 font-medium">
            <li>
              <Link 
                to="/" 
                className={cn(
                  "px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard" 
                className={cn(
                  "px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/dashboard") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/report" 
                className={cn(
                  "px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/report") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Reports
              </Link>
            </li>
            <li>
              <Link 
                to="#" 
                className={cn(
                  "px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/settings") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Settings
              </Link>
            </li>
          </ul>

          {/* Desktop right side buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button 
              onClick={toggleDarkMode} 
              className="text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-full"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {isAuthenticated ? (
              <Link 
                to="/profile" 
                className="flex items-center gap-2 text-gray-700 hover:text-blue-700 px-3 py-2 rounded-full hover:bg-blue-50 transition-colors border border-gray-200"
              >
                <User size={18} />
                Profile
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full transition-colors"
                >
                  <LogIn size={18} />
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="flex items-center gap-2 text-blue-600 border border-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full transition-colors"
                >
                  <UserPlus size={18} />
                  Signup
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="sm:hidden px-4 pb-4 bg-white border-t border-gray-200">
          <ul className="space-y-2">
            <li>
              <Link 
                to="/" 
                onClick={() => setIsOpen(false)} 
                className={cn(
                  "block px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard" 
                onClick={() => setIsOpen(false)} 
                className={cn(
                  "block px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/dashboard") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/report" 
                onClick={() => setIsOpen(false)} 
                className={cn(
                  "block px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/report") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Reports
              </Link>
            </li>
            <li>
              <Link 
                to="#" 
                onClick={() => setIsOpen(false)} 
                className={cn(
                  "block px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  isActive("/settings") && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                Settings
              </Link>
            </li>

            {isAuthenticated ? (
              <li>
                <Link 
                  to="/profile" 
                  onClick={() => setIsOpen(false)} 
                  className="block px-3 py-2 rounded-md text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <User size={18} />
                    Profile
                  </div>
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link 
                    to="/login" 
                    onClick={() => setIsOpen(false)} 
                    className="block px-3 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <LogIn size={18} />
                      Login
                    </div>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/signup" 
                    onClick={() => setIsOpen(false)} 
                    className="block px-3 py-2 rounded-md text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <UserPlus size={18} />
                      Signup
                    </div>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
