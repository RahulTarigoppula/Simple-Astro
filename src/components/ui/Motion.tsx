// Small motion pieces shared by every screen: a block that rises into place (staggered by its index)
// and a number that counts up. Both stand still when the reader asks for less motion.
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 0.8, 0.2, 1] as const;

interface RevealProps {
  /** Position in the stagger: 0 arrives first. */
  i?: number;
  className?: string;
  children: React.ReactNode;
}

/** Rises and fades in once, a beat after the block before it. */
export function Reveal({ i = 0, className, children }: RevealProps) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={still ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.08 + i * 0.07, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A whole number that counts up to its value the first time it is shown. */
export function CountUp({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const still = useReducedMotion();
  const skip = still || import.meta.env.MODE === "test";
  const [shown, setShown] = useState(skip ? value : 0);
  const from = useRef(skip ? value : 0);
  useEffect(() => {
    if (skip) {
      setShown(value);
      return;
    }
    const c = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    from.current = value;
    return () => c.stop();
  }, [value, duration, skip]);
  return <>{shown}</>;
}
