// src/screens/LoadingScreen.jsx
import React, { useEffect, useState } from 'react';

const steps = [
  "Retrieving insights from website...",
  "Isolating intent from description...",
  "Fetching qualified leads...",
  "Compiling lead intelligence...",
  "Just finishing up…",
];

const LoadingScreen = ({ isDone = false, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // animate steps only while not done
  useEffect(() => {
    if (isDone) return;

    const totalSteps = steps.length;
    let cancelled = false;

    const tick = () => {
      const delay = 3000 + Math.random() * 5000;
      setTimeout(() => {
        if (cancelled) return;
        setStepIndex(prev => {
          const next = Math.min(prev + 1, totalSteps - 1);
          setProgress(Math.round(((next + 1) / totalSteps) * 100));
          tick();
          return next;
        });
      }, delay);
    };

    tick();
    return () => { cancelled = true; };
  }, [isDone]);

  // once backend is done → finish bar and call onComplete
  useEffect(() => {
    if (!isDone) return;
    setStepIndex(steps.length - 1);
    setProgress(100);
    const t = setTimeout(() => onComplete?.(), 400);
    return () => clearTimeout(t);
  }, [isDone, onComplete]);

  return (
    <div className="min-h-screen bg-[#012A4A] flex flex-col items-center justify-center text-white px-6">
      <div className="text-xl md:text-2xl font-medium tracking-wide mb-6 text-center">
        {steps[Math.min(stepIndex, steps.length - 1)]}
      </div>

      <div className="w-full max-w-xl h-3 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 text-sm text-gray-200 font-semibold">
        {progress}% Complete
      </div>
    </div>
  );
};

export default LoadingScreen;