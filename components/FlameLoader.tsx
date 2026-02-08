import React from "react";
import { motion } from "framer-motion";

const FlameLoader: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-5">
      <div className="relative w-20 h-20">
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-orange-500 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
          className="absolute inset-2 bg-red-600 rounded-full"
        />
        <motion.svg
          animate={{ y: [0, -3, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          viewBox="0 0 24 24"
          fill="none"
          className="absolute inset-0 w-full h-full text-orange-500 drop-shadow-[0_0_12px_rgba(255,69,0,0.6)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 18C15 18 17 15 17 12C17 9 15 6 12 2C9 6 7 9 7 12C7 15 9 18 12 18Z"
            fill="#FF4500"
          />
          <path
            d="M12 16C13.5 16 14.5 14.5 14.5 13C14.5 11.5 13.5 10 12 8C10.5 10 9.5 11.5 9.5 13C9.5 14.5 10.5 16 12 16Z"
            fill="#FFD700"
          />
        </motion.svg>
      </div>
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-orange-400/80 text-xs font-medium tracking-wide text-center"
      >
        {message}
      </motion.p>
    </div>
  );
};

export default FlameLoader;
