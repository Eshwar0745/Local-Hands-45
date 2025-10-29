import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiZap, FiCheckCircle } from 'react-icons/fi';

const INTERESTING_FACTS = [
  "💡 Did you know? The first online marketplace launched in 1995!",
  "🌍 Over 50% of service bookings now happen on mobile devices.",
  "⚡ Our providers respond within an average of 2 minutes!",
  "🎯 Customer satisfaction is 95% when bookings are accepted within 5 minutes.",
  "🔧 Professional service providers complete over 10,000 jobs monthly on our platform.",
  "🌟 Highly rated providers accept bookings 3x faster than average.",
  "📱 Instant notifications ensure providers never miss your request!",
  "💼 Our top providers have completed over 500 successful jobs.",
  "🚀 Technology has reduced service waiting times by 70% in the last decade.",
  "🤝 Trust and transparency create better customer-provider relationships.",
  "⏱️ Most providers accept bookings within 3-5 minutes during peak hours.",
  "🏆 Providers with 5-star ratings get 80% more booking requests.",
  "🔔 Real-time alerts keep providers connected 24/7.",
  "💬 Clear communication increases job completion rates by 45%.",
  "📊 Data shows morning bookings get accepted fastest!",
  "🎨 Quality service creates lasting customer loyalty.",
  "🌈 Every completed job helps build our trusted community.",
  "⭐ Reviews help future customers make informed decisions.",
  "🛠️ Skilled professionals are just a tap away!",
  "💪 Our platform connects thousands of customers with experts daily."
];

export default function WaitingScreen({ isOpen, bookingId, onAccepted, onCancel, estimatedWait = 300 }) {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Rotate facts every 5 seconds
  useEffect(() => {
    if (!isOpen) return;
    const factInterval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % INTERESTING_FACTS.length);
    }, 5000);
    return () => clearInterval(factInterval);
  }, [isOpen]);

  // Count elapsed time
  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = Math.min((elapsedTime / estimatedWait) * 100, 95);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 z-50 flex items-center justify-center p-6"
      >
      <div className="max-w-2xl w-full">
        {/* Animated Logo/Icon */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="relative"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
              <FiZap className="w-12 h-12 text-white" />
            </div>
          </motion.div>
        </motion.div>

        {/* Main Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Finding the Perfect Provider
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Your request is being sent to available providers...
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              Elapsed: {formatTime(elapsedTime)}
            </span>
            <span>Avg wait: {Math.floor(estimatedWait / 60)} min</span>
          </div>
        </motion.div>

        {/* Rotating Facts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6 min-h-[160px] flex items-center justify-center border border-gray-100 dark:border-gray-700">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFactIndex}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <p className="text-xl font-medium text-gray-700 dark:text-gray-200">
                {INTERESTING_FACTS[currentFactIndex]}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pulsing Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center gap-4 mb-4"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>

        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-sm text-gray-500 dark:text-gray-400"
        >
          <p>We'll notify you as soon as a provider accepts your request</p>
          <p className="mt-2 flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <FiCheckCircle className="w-4 h-4" />
            You can close this and we'll send you an alert
          </p>
        </motion.div>

        {/* Cancel Button */}
        {onCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex justify-center mt-6"
          >
            <button
              onClick={onCancel}
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              Cancel Booking
            </button>
          </motion.div>
        )}

        {/* Booking ID */}
        {bookingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-center mt-6"
          >
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Booking ID: <span className="font-mono font-semibold">{bookingId}</span>
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
    </AnimatePresence>
  );
}
