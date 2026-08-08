import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { fadeInUp, EASE } from '@/lib/motion';

interface MotionCardProps extends HTMLMotionProps<'div'> {
  /** Stagger-friendly delay in seconds. */
  delay?: number;
}

/** Glassmorphism card with entrance + hover lift. Drop-in for `<div className="card">`. */
export function MotionCard({ children, delay = 0, className, ...props }: MotionCardProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      whileHover={{ y: -6, boxShadow: '0 22px 48px -18px rgba(0,0,0,0.55)' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { fadeInUp };
