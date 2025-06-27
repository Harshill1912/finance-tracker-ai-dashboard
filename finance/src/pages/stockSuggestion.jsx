import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp } from 'lucide-react';

const StockSuggestions = ({ value, onChange, onSelect, apiKey }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const searchStocks = async (query) => {
    if (!query.trim() || !apiKey) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${apiKey}`
      );
      const data = await response.json();

      if (data.bestMatches) {
        const stockSuggestions = data.bestMatches.slice(0, 8).map((match) => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          type: match['3. type'],
          region: match['4. region']
        }));
        setSuggestions(stockSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching stock suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value.length >= 2) {
        searchStocks(value);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, apiKey]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        inputRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.symbol);
    onSelect(suggestion.symbol, suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., AAPL, GOOGL, MSFT"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.symbol}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-1.5 rounded">
                  <TrendingUp className="w-3 h-3 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      {suggestion.symbol}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {suggestion.region}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-0.5">
                    {suggestion.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && value.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm"
        >
          {apiKey ? 'No stocks found for this search' : 'Enter API key to search stocks'}
        </div>
      )}
    </div>
  );
};

export default StockSuggestions;
