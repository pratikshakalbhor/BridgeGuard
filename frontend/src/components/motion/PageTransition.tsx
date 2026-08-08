import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageTransition } from '@/lib/motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/** Route-level transition wrapper. Use inside <motion.div> keyed by pathname. */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
