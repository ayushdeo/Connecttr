// src/components/LandingIntro.jsx
import React, { useEffect, useState } from "react";
import { Typewriter } from "react-simple-typewriter";
import { BRAND } from "../brand";

export default function LandingIntro({ onFinish }) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTagline, setShowTagline] = useState(false);
  const [animateExit, setAnimateExit] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowWelcome(false), 1000),
      setTimeout(() => setShowTagline(true), 1600),
      setTimeout(() => setAnimateExit(true), 5000),
      setTimeout(() => onFinish(), 6500)
    ];

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div
      className={`fixed top-0 left-0 w-full h-screen bg-[#0257AC] z-50 flex flex-col items-center justify-center transition-all duration-1000 ${animateExit ? "h-16 px-6 py-2 justify-start items-start" : ""
        }`}
    >
      <h1
        className={`text-white text-5xl lg:text-6xl font-bold transition-all duration-1000 ${showWelcome ? "opacity-100" : "opacity-0"
          } ${animateExit ? "text-2xl mt-2" : ""}`}
      >
        Welcome to
      </h1>

      <h1
        className={`text-white font-bold transition-all duration-1000 ${animateExit ? "text-2xl mt-0" : "text-6xl lg:text-7xl"
          } ${showWelcome ? "mt-4" : "mt-2"}`}
      >
        {BRAND}
      </h1>

      {showTagline && !animateExit && (
        <p className="text-[#F8F1FF] text-lg mt-4">
          <Typewriter
            words={["From Intent to Inbox."]}
            loop={false}
            cursor
            cursorStyle="_"
            typeSpeed={70}
            deleteSpeed={0}
            delaySpeed={1000}
          />
        </p>
      )}
    </div>
  );
}
