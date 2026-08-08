import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { EASE } from '@/lib/motion';

export function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-grid-faint px-6 text-center">
      <div className="pointer-events-none fixed inset-0 bg-hero-glow" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative"
      >
        <Logo />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
        className="relative"
      >
        <div className="font-mono text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text">404</span>
        </div>
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
          <FiAlertTriangle className="size-3.5" />
          Signal lost
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
          This bridge endpoint doesn’t exist
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">
          The page you’re looking for was never registered on the ledger — or it has been
          moved to a different route.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
        className="relative flex flex-wrap items-center justify-center gap-3"
      >
        <Link to="/app" className="btn-primary">
          <FiArrowLeft className="size-4" />
          Back to dashboard
        </Link>
        <Link to="/" className="btn-outline">
          Home
        </Link>
      </motion.div>
    </div>
  );
}
