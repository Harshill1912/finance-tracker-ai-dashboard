import React from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";

function Hero() {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 pt-6 md:pt-12 pb-10 md:pb-16 transition-colors duration-300">
      <div className="container mx-auto flex flex-col md:flex-row items-center px-6 md:px-12 gap-6">

        {/* Left Content */}
        <motion.div 
          className="md:w-1/2 text-center md:text-left space-y-5"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
            Save <span className="bg-gradient-to-r from-blue-500 to-blue-800 text-transparent bg-clip-text">Money</span> &  
            Manage Your Spendings
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Take full control of your expenses and make smart financial decisions effortlessly.
          </p>

          {/* Buttons */}
          <div className="flex justify-center md:justify-start gap-4">
            <Button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition">
              Get Started →
            </Button>
            <Button className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 transition">
              Learn More
            </Button>
          </div>
        </motion.div>

        {/* Right Image */}
        <motion.div 
          className="md:w-1/2 flex justify-center"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <img 
            src="/hero2.png" 
            alt="Finance Illustration" 
            className="w-full md:w-[95%] h-auto md:h-[500px]"
          />
        </motion.div>

      </div>
    </div>
  );
}

export default Hero;
