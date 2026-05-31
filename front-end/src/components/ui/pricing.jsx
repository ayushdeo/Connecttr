import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { cn } from "../../lib/utils";
import { CheckCircle, Star } from "lucide-react";
import { motion } from "framer-motion";

const frequencies = ["monthly", "yearly"];

// ─── BorderTrail ─────────────────────────────────────────────────────────────

export function BorderTrail({ className, size = 60, transition, delay, onAnimationComplete, style }) {
  const BASE_TRANSITION = { repeat: Infinity, duration: 5, ease: "linear" };
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn("absolute aspect-square bg-royal-amethyst", className)}
        style={{ width: size, offsetPath: `rect(0 auto auto 0 round ${size}px)`, ...style }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ ...(transition ?? BASE_TRANSITION), delay }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}

// ─── Frequency toggle ─────────────────────────────────────────────────────────

export function PricingFrequencyToggle({ frequency, setFrequency, className }) {
  return (
    <div className={cn("mx-auto flex w-fit rounded-full border border-overlay/20 bg-midnight-plum/30 p-1", className)}>
      {frequencies.map((freq) => (
        <button
          key={freq}
          onClick={() => setFrequency(freq)}
          className="relative px-5 py-1.5 text-sm capitalize font-medium"
          style={{ color: frequency === freq ? "white" : undefined }}
        >
          <span className="relative z-10 text-mist">{freq}</span>
          {frequency === freq && (
            <motion.span
              layoutId="frequency"
              transition={{ type: "spring", duration: 0.4 }}
              className="absolute inset-0 z-0 rounded-full bg-royal-amethyst"
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────

export function PricingCard({ plan, frequency = "monthly", className }) {
  const navigate = useNavigate();

  const displayPrice = () => {
    if (plan.isFree) return "Free";
    if (plan.isCustom) return "Custom";
    return `$${plan.price[frequency]}`;
  };

  const displayPeriod = () => {
    if (plan.isFree || plan.isCustom) return "";
    return frequency === "monthly" ? "/month" : "/year";
  };

  const yearSaving = plan.price
    ? Math.round(((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12)) * 100)
    : 0;

  return (
    <div className={cn("relative flex w-full flex-col rounded-2xl border border-overlay/10 bg-slate/60 backdrop-blur-sm overflow-hidden", plan.highlighted && "border-royal-amethyst/50", className)}>

      {plan.highlighted && (
        <BorderTrail
          size={80}
          style={{ boxShadow: "0px 0px 30px 10px rgba(124,58,237,0.4), 0 0 60px 20px rgba(124,58,237,0.2)" }}
        />
      )}

      {/* Card header */}
      <div className={cn("rounded-t-2xl border-b border-overlay/10 p-6", plan.highlighted && "bg-royal-amethyst/10")}>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {plan.highlighted && (
            <p className="flex items-center gap-1 rounded-md border border-royal-amethyst/40 bg-slate px-2 py-0.5 text-xs text-mist">
              <Star className="h-3 w-3 fill-current text-royal-amethyst" />
              Popular
            </p>
          )}
          {frequency === "yearly" && !plan.isFree && !plan.isCustom && yearSaving > 0 && (
            <p className="flex items-center gap-1 rounded-md border border-royal-amethyst/30 bg-royal-amethyst/20 px-2 py-0.5 text-xs text-lilac-mist">
              {yearSaving}% off
            </p>
          )}
        </div>

        <div className="text-base font-semibold text-mist">{plan.name}</div>
        <p className="text-sm text-soft-violet mt-0.5">{plan.info}</p>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-4xl font-black text-mist">{displayPrice()}</span>
          {displayPeriod() && (
            <span className="text-soft-violet mb-1.5 text-sm">{displayPeriod()}</span>
          )}
        </div>
      </div>

      {/* Features */}
      <div className={cn("flex-1 space-y-3.5 px-6 py-6 text-sm text-soft-violet", plan.highlighted && "bg-royal-amethyst/5")}>
        <TooltipProvider>
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 text-royal-amethyst flex-shrink-0" />
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <p className={cn(feature.tooltip && "cursor-pointer border-b border-dashed border-soft-violet/40")}>
                    {feature.text}
                  </p>
                </TooltipTrigger>
                {feature.tooltip && (
                  <TooltipContent><p>{feature.tooltip}</p></TooltipContent>
                )}
              </Tooltip>
            </div>
          ))}
        </TooltipProvider>
      </div>

      {/* CTA */}
      <div className={cn("mt-auto border-t border-overlay/10 p-4", plan.highlighted && "bg-royal-amethyst/10")}>
        <Button
          className="w-full"
          variant={plan.highlighted ? "default" : "outline"}
          onClick={() => navigate(plan.btn.href)}
        >
          {plan.btn.text}
        </Button>
      </div>
    </div>
  );
}

// ─── Pricing section ──────────────────────────────────────────────────────────

export function PricingSection({ plans, heading, description, className }) {
  const [frequency, setFrequency] = React.useState("monthly");

  return (
    <div className={cn("flex w-full flex-col items-center justify-center gap-10", className)}>
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-mist md:text-4xl">{heading}</h2>
        {description && <p className="text-soft-violet text-sm md:text-base">{description}</p>}
      </div>
      <PricingFrequencyToggle frequency={frequency} setFrequency={setFrequency} />
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard plan={plan} key={plan.name} frequency={frequency} />
        ))}
      </div>
    </div>
  );
}
