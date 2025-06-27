
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Player } from "@lottiefiles/react-lottie-player";
import botAnimation from "./bot.json";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Volume2, VolumeX, Sun, Moon, SendHorizontal, Loader2 } from "lucide-react";

const API_KEY = import.meta.env.VITE_COHERE_API_KEY;
const COHERE_API_URL = "https://api.cohere.ai/v1/generate";

function Ai() {
  const [userQuestion, setUserQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserQuestion((prev) => prev + " " + transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      alert("Speech Recognition not supported in this browser.");
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening((prev) => !prev);
  };

  const getAiResponse = async () => {
    if (!userQuestion.trim()) return;
    
    setLoading(true);
    setResponse("");

    const requestBody = {
      model: "command",
      prompt: userQuestion,
      max_tokens: 500,
      temperature: 0.8,
    };

    try {
      const res = await axios.post(COHERE_API_URL, requestBody, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (res.data?.generations?.[0]?.text) {
        const aiText = res.data.generations[0].text.trim();
        let i = 0;
        const typeEffect = () => {
          if (i < aiText.length) {
            setResponse((prev) => prev + aiText.charAt(i));
            i++;
            setTimeout(typeEffect, 20);
          }
        };
        typeEffect();
      } else {
        setResponse("❌ No valid response from Cohere.");
      }
    } catch (err) {
      console.error(err);
      setResponse("❌ Failed to fetch response from Cohere.");
    }

    setLoading(false);
  };

  // Text-to-Speech
  const handleSpeak = () => {
    if (!response) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(response);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      getAiResponse();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
      <Card className="w-full max-w-4xl bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700">
        <CardContent className="p-6 md:p-8">
          {/* Header with Toggle */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Player
                  autoplay
                  loop
                  src={botAnimation}
                  style={{ height: "40px", width: "40px" }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Financial Assistant
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Powered by AI</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-full h-9 w-9"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Question Input */}
            <div className="relative">
              <Textarea
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me about investments, budgeting, taxes, or any financial questions..."
                className="min-h-32 w-full resize-none pr-12 text-base focus-visible:ring-blue-500"
              />
              <Button
                onClick={getAiResponse}
                disabled={loading || !userQuestion.trim()}
                className="absolute bottom-3 right-3 h-9 w-9 p-0 rounded-full"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
              </Button>
            </div>

            {/* Voice Controls */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleListening}
                className={`gap-2 ${isListening ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" : ""}`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isListening ? "Stop Listening" : "Voice Input"}
              </Button>
              
              {response && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSpeak}
                  className={`gap-2 ${isSpeaking ? "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400" : ""}`}
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isSpeaking ? "Stop Audio" : "Listen"}
                </Button>
              )}
            </div>

            {/* AI Response */}
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                  <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Analyzing your question...</p>
                </div>
              </div>
            )}

            {response && !loading && (
              <Card className="overflow-hidden border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 text-sm">AI</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Response</h3>
                  </div>
                  
                  <div className="pl-10">
                    <p className="whitespace-pre-line leading-relaxed text-gray-700 dark:text-gray-200">
                      {response}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Ai;