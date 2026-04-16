// src/screens/LoadingScreen.jsx
import React from 'react';

const LoadingScreen = ({ progress = 0, message = "Initializing engine..." }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate/60 backdrop-blur-md rounded-2xl border border-white/5 animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-xl md:text-2xl font-semibold tracking-wide text-center text-white drop-shadow-md">
          {message}
        </div>

        <div className="w-full h-3 bg-slate rounded-full overflow-hidden border border-white/10 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-royal-amethyst to-fuchsia-500 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(156,39,176,0.5)]"
            style={{ width: `${Math.max(5, Math.min(progress, 100))}%` }}
          />
        </div>

        <div className="text-sm text-mist font-medium text-center">
          {Math.min(progress, 100)}% Complete
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;