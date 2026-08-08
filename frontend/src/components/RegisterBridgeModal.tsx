import { useState } from 'react';
import { toast } from 'sonner';
import { FiBox } from 'react-icons/fi';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedSuccess } from '@/components/motion/AnimatedSuccess';
import { motion } from 'framer-motion';
import { registerBridge } from '@/services/midnight';
import { useWallet } from '@/hooks/useWallet';
import { CHAIN_IDS, chainName } from '@/utils/constants';

interface RegisterBridgeModalProps {
  open: boolean;
  onClose: () => void;
  onRegistered?: () => void;
}

export function RegisterBridgeModal({ open, onClose, onRegistered }: RegisterBridgeModalProps) {
  const { address: walletAddress } = useWallet();
  const [name, setName] = useState('');
  const [srcChain, setSrcChain] = useState('1');
  const [dstChain, setDstChain] = useState('42161');
  const [tvl, setTvl] = useState('100000000');
  const [audited, setAudited] = useState(true);
  const [incidents, setIncidents] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [txId, setTxId] = useState('');
  const [blockHeight, setBlockHeight] = useState('');

  const reset = () => {
    setName('');
    setSrcChain('1');
    setDstChain('42161');
    setTvl('100000000');
    setAudited(true);
    setIncidents('0');
    setDone(false);
    setTxId('');
    setBlockHeight('');
  };

  const close = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Bridge name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        srcChain,
        dstChain,
        tvl,
        audited: audited ? 1 : 0,
        incidents,
        walletAddress: walletAddress ?? undefined,
      };
      const result = await registerBridge(payload);
      setTxId(result.txId);
      setBlockHeight(result.blockHeight);
      setDone(true);
      toast.success(`Bridge "${name.trim()}" registered`, {
        description: `Tx ${result.txId} · block ${result.blockHeight}`,
      });
      onRegistered?.();
    } catch (err) {
      toast.error('Registration failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Register a bridge">
      {done ? (
        <motion.div
          className="flex flex-col items-center gap-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatedSuccess size={64} />
          <div className="text-center">
            <p className="font-semibold text-white">{name} is on the ledger.</p>
            <p className="mt-1 font-mono text-xs text-cyan-300">tx {txId}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-400">block {blockHeight}</p>
          </div>
          <Button variant="outline" onClick={close}>
            Done
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <label>
            <span className="label">Bridge name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MyBridge"
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="label">Source chain</span>
              <select className="input" value={srcChain} onChange={(e) => setSrcChain(e.target.value)}>
                {CHAIN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {chainName(id)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Destination chain</span>
              <select className="input" value={dstChain} onChange={(e) => setDstChain(e.target.value)}>
                {CHAIN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {chainName(id)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="label">TVL (USD)</span>
              <input
                className="input"
                type="number"
                min="0"
                value={tvl}
                onChange={(e) => setTvl(e.target.value)}
              />
            </label>
            <label>
              <span className="label">Public incidents</span>
              <input
                className="input"
                type="number"
                min="0"
                value={incidents}
                onChange={(e) => setIncidents(e.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Independently audited</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audited bridges start from a lower base risk score.
              </p>
            </div>
            <Badge tone={audited ? 'success' : 'warning'}>{audited ? 'Yes' : 'No'}</Badge>
            <button
              type="button"
              onClick={() => setAudited((v) => !v)}
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ backgroundColor: audited ? '#22d3ee' : 'rgba(148,163,184,0.4)' }}
              aria-pressed={audited}
              aria-label="Toggle audited"
            >
              <span
                className="absolute top-0.5 size-5 rounded-full bg-white shadow transition-all"
                style={{ left: audited ? '22px' : '2px' }}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 text-xs text-violet-600 dark:text-violet-300">
            <FiBox className="size-3.5 shrink-0" />
            Writes a transparent registry entry via registerBridge on the Midnight ledger.
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} loading={submitting}>
              <FiBox className="size-4" />
              Register bridge
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
