import { FiLink } from 'react-icons/fi';
import { Modal } from '@/components/ui/Modal';
import type { WalletOption } from '@/services/wallet';

interface WalletSelectModalProps {
  open: boolean;
  wallets: WalletOption[];
  onClose: () => void;
  onSelect: (walletId: string) => void;
}

/** Lets the user pick which installed Midnight wallet extension to connect. */
export function WalletSelectModal({ open, wallets, onClose, onSelect }: WalletSelectModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Select a wallet">
      <p className="text-sm text-slate-400">
        Multiple Midnight wallets were detected. Choose which wallet to connect.
      </p>
      <div className="mt-5 space-y-3">
        {wallets.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelect(w.id)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/5 dark:border-white/10"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-cyan-400/10 text-cyan-400">
                <FiLink className="size-4" />
              </span>
              <span className="font-medium text-slate-900 dark:text-white">{w.name}</span>
            </span>
            {w.rdns && <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{w.rdns}</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}