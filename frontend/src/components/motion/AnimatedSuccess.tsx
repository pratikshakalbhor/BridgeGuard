import { motion } from 'framer-motion';
import { EASE } from '@/lib/motion';

interface AnimatedSuccessProps {
  size?: number;
  className?: string;
}

/** Animated success checkmark — used after toasts / completed actions. */
export function AnimatedSuccess({ size = 56, className }: AnimatedSuccessProps) {
  return (
    <motion.svg
      viewBox="0 0 52 52"
      width={size}
      height={size}
      className={className}
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="url(#bg-success)"
        strokeWidth="3"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.6, ease: EASE } },
        }}
      />
      <motion.path
        d="M14 27l8 8 16-16"
        fill="none"
        stroke="#34d399"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { delay: 0.45, duration: 0.4, ease: EASE },
          },
        }}
      />
      <defs>
        <linearGradient id="bg-success" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}
