import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';
import { backdropVariants, modalVariants } from '@/lib/motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

/**
 * Accessible, animated modal with backdrop blur and spring entrance.
 *
 * The overlay is rendered in a portal to `document.body`: an ancestor with a
 * `filter`/`backdrop-filter`/`transform` (e.g. the app topbar's backdrop blur,
 * or the route transition wrapper) would otherwise become the containing block
 * of the `position: fixed` overlay and clip the dialog content.
 */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4">
          <motion.div
            className="absolute inset-0 bg-midnight-950/70 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${maxWidth} rounded-2xl border border-white/10 bg-midnight-800/90 p-6 shadow-card backdrop-blur-2xl`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <FiX className="size-4" />
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
