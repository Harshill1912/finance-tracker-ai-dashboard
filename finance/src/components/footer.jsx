import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  // Only real, existing app routes — no placeholder marketing pages.
  const links = [
    { name: 'Dashboard', to: '/dashboard' },
    { name: 'Expenses', to: '/expenses' },
    { name: 'Budgets', to: '/budgets' },
    { name: 'Split Expenses', to: '/splitexpenses' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FinancePro AI</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="text-gray-400 text-sm">
            © {currentYear} FinancePro AI
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
