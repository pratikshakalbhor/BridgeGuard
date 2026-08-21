import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FiAlertTriangle, FiBox, FiCheckCircle, FiSearch } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RiskMeter } from '@/components/RiskMeter';
import { AiRecommendationCard } from '@/components/AiRecommendationCard';
import { ErrorComponent } from '@/components/ErrorComponent';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedSuccess } from '@/components/motion/AnimatedSuccess';
import { RegisterBridgeModal } from '@/components/RegisterBridgeModal';
import { useAppData } from '@/hooks/useAppData';
import { useWallet } from '@/hooks/useWallet';
import { assessBridge, publicRecommendationFor, type Assessment } from '@/utils/riskEngine';
import { CHAIN_IDS, chainName } from '@/utils/constants';
import { cn, fmtCompact, shortAddress } from '@/utils/format';
import { getSecurityStatus, evaluateBridgeWithWallet } from '@/services/midnight';
import { BRIDGEGUARD_NETWORK_ID, networkLabel } from '@/services/wallet';
import type { WalletSignStep } from '@/services/midnight';
import { loadPreferences } from '@/utils/preferences';
import { TvlSnapshotChart } from '@/components/charts/TvlSnapshotChart';
import { deriveTvlSnapshot } from '@/utils/deriveData';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function BridgeAnalysis() {
  const { state, loading, error: dataError, refresh } = useAppData();
  const { address: walletAddress, status: walletStatus, session: walletSession } = useWallet();
  const bridges = state?.ledger.bridges ?? [];

  const [srcChain, setSrcChain] = useState('1');
  const [dstChain, setDstChain] = useState('42161');
  const [amount, setAmount] = useState('10000');
  const [bridgeId, setBridgeId] = useState('');
  const [maxRisk, setMaxRisk] = useState(() => loadPreferences().defaultTolerance);
  const [intel, setIntel] = useState(() => loadPreferences().defaultIntel);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);
  const [txStatus, setTxStatus] = useState<{
    txId: string;
    blockHeight: string | null;
    walletAddress?: string | null;
    status: 'confirmed' | 'pending';
    signing: 'wallet';
  } | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [justDone, setJustDone] = useState(false);
  // Evaluation always runs through the connected Midnight wallet: the ZK proof
  // is generated locally in the browser (Midnight.js SDK) and the wallet
  // balances, signs and pays the DUST fee.
  const [walletStep, setWalletStep] = useState<WalletSignStep | null>(null);
  const [walletStepMessage, setWalletStepMessage] = useState<string | null>(null);

  const candidates = useMemo(() => {
    return bridges.filter((b) => b.srcChain === srcChain && b.dstChain === dstChain);
  }, [bridges, srcChain, dstChain]);

  const selectedBridge = useMemo(
    () => candidates.find((b) => b.id === bridgeId) ?? null,
    [candidates, bridgeId],
  );

  const tvlSnapshot = useMemo(
    () => (state ? deriveTvlSnapshot(state) : []),
    [state],
  );

  const routeTvl = useMemo(() => {
    const ids = new Set(candidates.map((b) => b.id));
    return tvlSnapshot.filter((d) => ids.has(d.bridgeId));
  }, [candidates, tvlSnapshot]);

  useEffect(() => {
    setResult(null);
    setTxStatus(null);
    setError(null);
    setJustDone(false);
    setWalletStep(null);
    setWalletStepMessage(null);
  }, [srcChain, dstChain, amount, bridgeId, maxRisk, intel]);

  // A bridge id only ever refers to bridges of the currently selected route;
  // drop it when the route changes so the UI never pretends a stale bridge is
  // selected on the new Source → Destination pair.
  useEffect(() => {
    setBridgeId('');
  }, [srcChain, dstChain]);

  const analyze = async () => {
    const bridge = selectedBridge;
    if (!bridge) {
      toast.error('No bridge selected', {
        description: 'No bridge is registered for this route. Register one or change the chains.',
      });
      return;
    }
    if (walletStatus !== 'connected') {
      toast.error('Connect your Midnight wallet first', {
        description: 'Evaluation requires local proof generation in your browser — use the "Connect wallet" button.',
      });
      return;
    }
    setRunning(true);
    setError(null);
    setTxStatus(null);
    setResult(null);
    setJustDone(false);
    setWalletStep(null);
    setWalletStepMessage(null);
    try {
      const local = assessBridge(bridge, Number(amount) || 0, maxRisk, intel);

      let txId = '';
      let blockHeight: string | null = null;
      let txState: 'confirmed' | 'pending' = 'confirmed';
      let verdict: number | null = null;
      let verdictLabel: string | null = null;
      let within: boolean | null = null;

      if (walletStatus !== 'connected') {
        throw new Error('Wallet disconnected — reconnect to generate the proof locally.');
      }

      // Browser-local proving path: the browser creates the unproven call tx,
      // the connected wallet generates the ZK proof locally, balances, signs
      // and pays the DUST fee; the browser watches the indexer and reads back
      // the disclosed coarse verdict. Private amount/maxRisk/intel never leave
      // the browser.
      const wres = await evaluateBridgeWithWallet(
        {
          bridgeId: bridge.id,
          amount: String(Number(amount) || 0),
          maxRisk,
          intel,
        },
        (step, message) => {
          setWalletStep(step);
          setWalletStepMessage(message);
        },
      );
      txId = wres.txId;
      blockHeight = wres.blockHeight ?? null;
      txState = wres.status;
      verdict = wres.verdict !== null ? Number(wres.verdict) : null;
      verdictLabel = wres.verdictLabel;
      within = wres.within;

      setTxStatus({ txId, blockHeight, walletAddress: walletAddress ?? null, status: txState, signing: 'wallet' });

      if (txState === 'confirmed') {
        const assessment: Assessment = {
          ...local,
          verdict: verdict ?? local.verdict,
          verdictLabel: verdictLabel ?? local.verdictLabel,
          within: within ?? local.within,
        };
        setResult(assessment);
      } else {
        // Not yet confirmed on the indexer: do not claim a disclosed verdict.
        setResult(null);
      }

      setJustDone(true);
      setTimeout(() => setJustDone(false), 2200);
      toast.success('Evaluation submitted via your wallet', {
        description:
          txState === 'confirmed'
            ? `${bridge.name} · tx ${txId.slice(0, 10)}…`
            : `${bridge.name} · submitted, awaiting indexer confirmation (tx ${txId.slice(0, 10)}…)`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      toast.error('Analysis failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(false);
    }
  };

  if (!state) {
    return loading ? (
      <EmptyState title="Reading BridgeGuard state…" body="Fetching live bridge state directly from the Midnight contract indexer." />
    ) : (
      <ErrorComponent message={dataError ?? 'Unable to reach the BridgeGuard backend.'} onRetry={refresh} />
    );
  }

  const security = result && selectedBridge ? getSecurityStatus(selectedBridge) : null;

  return (
    <div className="space-y-6">
      {/* Form */}
      <section className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FiSearch className="size-4 text-cyan-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Confidential evaluation
              </h2>
              <Badge tone="success">on-chain</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setRegisterOpen(true)}>
              <FiBox className="size-4" />
              Register bridge
            </Button>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
            <label>
              <span className="label">Transfer amount (private)</span>
              <input
                className="input"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              <span className="label">Bridge on route</span>
              <select
                className="input"
                value={bridgeId}
                onChange={(e) => setBridgeId(e.target.value)}
                disabled={candidates.length === 0}
                aria-disabled={candidates.length === 0}
              >
                {candidates.length === 0 ? (
                  <option value="">No bridge registered for this route</option>
                ) : (
                  <>
                    <option value="" disabled>
                      Select a bridge…
                    </option>
                    {candidates.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>
          </div>

          {candidates.length === 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-500 dark:text-amber-400">
              <FiAlertTriangle className="size-3.5" />
              No bridge is registered for {chainName(srcChain)} → {chainName(dstChain)}. Register one or pick a different route.
            </p>
          )}

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label>
              <span className="label">Risk tolerance (private)</span>
              <select className="input" value={maxRisk} onChange={(e) => setMaxRisk(Number(e.target.value))}>
                <option value={0}>0 · Low</option>
                <option value={1}>1 · Medium</option>
                <option value={2}>2 · High</option>
                <option value={3}>3 · Critical</option>
              </select>
            </label>
            <label>
              <span className="label">Intel feed (0–20, private)</span>
              <input
                className="input"
                type="number"
                min="0"
                max="20"
                value={intel}
                onChange={(e) => setIntel(Math.max(0, Math.min(20, Number(e.target.value))))}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={analyze}
              loading={running}
              disabled={!selectedBridge || running || walletStatus !== 'connected'}
              size="lg"
            >
              <FiSearch className="size-4" />
              Analyze with my wallet
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {walletStatus === 'connected'
                ? `Your ${walletSession?.walletName ?? 'Midnight'} wallet generates the zero-knowledge proof locally in your browser on ${networkLabel(BRIDGEGUARD_NETWORK_ID)}; the wallet balances, signs and pays the DUST fee. Only the coarse verdict becomes public.`
                : 'Connect your Midnight wallet — the zero-knowledge proof is generated locally in your browser, never on a server.'}
            </p>
          </div>

          {running && walletStep && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-600 dark:text-cyan-300">
              <LoadingSpinner className="size-4 shrink-0" />
              <span>{walletStepMessage ?? 'Processing…'}</span>
            </div>
          )}
        </div>
      </section>

      {error && <ErrorComponent message={error} />}

      {/* Success flash */}
      <AnimatePresence>
        {justDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-4"
          >
            <AnimatedSuccess size={36} />
            <p className="text-sm font-semibold text-emerald-500 dark:text-emerald-300">
              {txStatus?.status === 'pending'
                ? 'Evaluation submitted — proof generated; waiting for on-chain confirmation.'
                : 'Evaluation complete — proof generated and verdict disclosed.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {txStatus && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-600 dark:text-cyan-300">
          <span className="flex items-center gap-2">
            <FiCheckCircle className="size-4" />
            {txStatus.status === 'pending'
              ? 'Evaluation transaction submitted — awaiting indexer confirmation'
              : `Evaluation transaction confirmed on-chain · ${networkLabel(BRIDGEGUARD_NETWORK_ID)}`}
          </span>
          <span className="font-mono">
            tx {shortAddress(txStatus.txId, 10, 6)}
            {txStatus.blockHeight ? ` · block ${txStatus.blockHeight}` : ' · pending'}
            {txStatus.signing === 'wallet' ? ' · signed by wallet' : ''}
          </span>
          {txStatus.walletAddress && (
            <span className="font-mono">from {shortAddress(txStatus.walletAddress, 8, 6)}</span>
          )}
        </div>
      )}

      {result && selectedBridge ? (
        <>
          {/* Security status + warning */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4',
              security?.tone === 'critical'
                ? 'border-red-400/30 bg-red-400/10 text-red-500 dark:text-red-300'
                : security?.tone === 'warning'
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-500 dark:text-amber-300'
                  : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-500 dark:text-emerald-300',
            )}
          >
            <Badge tone={security?.tone ?? 'neutral'} className="px-3 py-1 text-xs">
              Bridge Status: {security?.label ?? '—'}
            </Badge>
            <span className="flex items-center gap-2 text-sm font-medium">
              <FiAlertTriangle className="size-4" />
              {security?.detail}
            </span>
          </motion.section>

          <section className="grid gap-6 xl:grid-cols-3">
            {/* Risk score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card flex flex-col items-center justify-center p-6"
            >
              <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {selectedBridge.name} — on-chain risk
              </div>
              <div className="mt-4">
                <RiskMeter score={result.baseScore} size="lg" label="On-chain risk score" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Badge tone={result.tone}>On-chain Verdict: {result.verdictLabel}</Badge>
                <Badge tone={result.within ? 'success' : 'critical'}>
                  {result.within ? 'Within tolerance' : 'Exceeds tolerance'}
                </Badge>
              </div>
            </motion.div>

            {/* Public liquidity health */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Liquidity health
              </h2>
              <div className="mt-4 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                ${fmtCompact(selectedBridge.tvl)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total value locked</div>
              <div className="mt-5 space-y-3">
                {[
                  { label: 'Audited', ok: Number(selectedBridge.audited) === 1 },
                  { label: 'Public incidents', ok: Number(selectedBridge.incidents) <= 2 },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-white/[0.07]"
                  >
                    <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
                    <span
                      className={cn(
                        'font-mono text-xs font-bold',
                        row.ok ? 'text-emerald-400' : 'text-amber-400',
                      )}
                    >
                      {row.ok ? 'OK' : 'Watch'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {Number(selectedBridge.tvl) >= 1_000_000_000
                  ? 'Deep audited pool — ample public liquidity on this route.'
                  : Number(selectedBridge.incidents) > 2
                    ? 'Pool carries multiple public incidents — treat with caution.'
                    : 'Routine pool with active on-chain monitoring.'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AiRecommendationCard
                recommendation={publicRecommendationFor(
                  selectedBridge,
                  result.verdict,
                  result.baseScore,
                  result.incidentScore,
                )}
              />
            </motion.div>
          </section>

          {/* Score breakdown */}
          <section className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Score breakdown
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Base risk score', value: result.baseScore, hint: 'audit + public incidents' },
                { label: 'Incident exposure', value: result.incidentScore, hint: `${selectedBridge.incidents} incidents × 5` },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/[0.07] dark:bg-midnight-900/50"
                >
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {f.label}
                  </div>
                  <div
                    className={cn(
                      'mt-1 font-mono text-2xl font-bold',
                      f.value >= 55 ? 'text-red-400' : f.value >= 30 ? 'text-amber-400' : 'text-emerald-400',
                    )}
                  >
                    {f.value}
                  </div>
                  <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{f.hint}</div>
                </motion.div>
              ))}
            </div>
          </section>
        </>
      ) : (
        !error && (
          <EmptyState
            icon={FiSearch}
            title="No evaluation yet"
            body={`Set your route (${chainName(srcChain)} → ${chainName(dstChain)}) and amount, then run an analysis to see the zero-knowledge verdict, on-chain risk score and AI recommendation.`}
          />
        )
      )}

      {selectedBridge && !result && (
        <section className="card p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {chainName(srcChain)} → {chainName(dstChain)} · TVL by bridge
          </h2>
          {routeTvl.length === 0 ? (
            <EmptyState
              icon={FiBox}
              title="No data available"
              body="No bridges registered on-chain for this route yet."
            />
          ) : (
            <TvlSnapshotChart data={routeTvl} />
          )}
        </section>
      )}

      <RegisterBridgeModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={() => void refresh()}
      />
    </div>
  );
}
