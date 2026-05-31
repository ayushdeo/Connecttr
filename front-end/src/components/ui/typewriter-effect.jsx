import { cn } from "../../lib/utils";
import { motion, stagger, useAnimate, useInView } from "framer-motion";
import { useEffect } from "react";

export const TypewriterEffect = ({ words, className, cursorClassName }) => {
  const wordsArray = words.map((word) => ({ ...word, text: word.text.split("") }));
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope);

  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        { display: "inline-block", opacity: 1, width: "fit-content" },
        { duration: 0.3, delay: stagger(0.1), ease: "easeInOut" }
      );
    }
  }, [isInView]);

  return (
    <div className={cn("text-base sm:text-xl md:text-3xl lg:text-5xl font-bold text-center", className)}>
      <motion.div ref={scope} className="inline">
        {wordsArray.map((word, idx) => (
          <div key={`word-${idx}`} className="inline-block">
            {word.text.map((char, index) => (
              <motion.span
                initial={{}}
                key={`char-${index}`}
                className={cn("opacity-0 hidden", word.className)}
              >
                {char}
              </motion.span>
            ))}
            &nbsp;
          </div>
        ))}
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        className={cn("inline-block rounded-sm w-[4px] h-4 md:h-6 lg:h-10 bg-royal-amethyst", cursorClassName)}
      />
    </div>
  );
};

export const TypewriterEffectSmooth = ({ words, className, cursorClassName }) => {
  const wordsArray = words.map((word) => ({ ...word, text: word.text.split("") }));

  const renderWords = () =>
    wordsArray.map((word, idx) => (
      <span key={`word-${idx}`} className="inline-block">
        {word.text.map((char, index) => (
          <span key={`char-${index}`} className={cn(word.className)}>{char}</span>
        ))}
        {idx < wordsArray.length - 1 && <span>&nbsp;</span>}
      </span>
    ));

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {/* Clip-reveal: expands from left, but text is on a single short line so it never overflows */}
      <div className="relative overflow-hidden" style={{ display: "flex", alignItems: "center" }}>
        <motion.div
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          whileInView={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          className="font-bold whitespace-nowrap"
          style={{ fontSize: "clamp(44px,7vw,76px)", lineHeight: 1.06, letterSpacing: "-0.025em" }}
        >
          {renderWords()}
        </motion.div>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, repeat: Infinity, repeatType: "reverse" }}
        className={cn("block rounded-sm w-[3px] h-12 sm:h-14 xl:h-16 bg-royal-amethyst flex-shrink-0", cursorClassName)}
      />
    </div>
  );
};
