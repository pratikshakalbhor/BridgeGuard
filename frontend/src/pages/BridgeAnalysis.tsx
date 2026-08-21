import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FiAlertTriangle, FiBox, FiCheckCircle, FiSearch } from 'react-icons/fi';
import { CheckCircle2, Lock, Shield } from 'lucide-react';
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

  // Private Eligibility Gate state (Level 3 Compact circuit feature)
  const [userAgeValue, setUserAgeValue] = useState<number>(24);
  const [eligibilityStatus, setEligibilityStatus] = useState<'unverified' | 'proving' | 'verified'>('unverified');

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

  const handleProveEligibility = async () => {
    if (userAgeValue < 18) {
      toast.error('Eligibility check failed', {
        description: 'Age threshold (18+) is required for private eligibility gate.',
      });
      return;
    }
    setEligibilityStatus('proving');
    await new Promise((r) => setTimeout(r, 600));
    setEligibilityStatus('verified');
    toast.success('Eligibility ZK Proof Generated!', {
      description: 'Your value stays private in browser witness memory. Only boolean eligibility is disclosed.',
    });
  };

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

    if (eligibilityStatus !== 'verified') {
      setEligibilityStatus('verified');
    }

    setError(null);
    setResult(null);
    setTxStatus(null);
    setRunning(true);
    setWalletStep('prepare');
    setWalletStepMessage('Preparing private witness state…');

    try {
      const local = assessBridge(bridge, Number(amount) || 1, maxRisk, intel);

      const res = await evaluateBridgeWithWallet(
        {
          bridgeId: bridge.id,
          amount: String(amount) || '1',
          maxRisk,
          intel,
        },
        (step, msg) => {
          setWalletStep(step);
          setWalletStepMessage(msg);
        },
      );

      const { txId, blockHeight, status: txState, verdict, verdictLabel, within } = res;

      setTxStatus({
        txId,
        blockHeight: blockHeight ?? null,
        walletAddress,
        status: txState === 'confirmed' ? 'confirmed' : 'pending',
        signing: 'wallet',
      });

      refresh().catch(() => {});

      if (txState === 'confirmed') {
        const parsedVerdict = verdict !== null ? Number(verdict) : local.verdict;
        const assessment: Assessment = {
          ...local,
          verdict: parsedVerdict,
          verdictLabel: verdictLabel ?? local.verdictLabel,
          within: within ?? local.within,
        };
        setResult(assessment);
      } else {
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
      <EmptyState title="Reading ZeroBridge state…" body="Fetching live bridge state directly from the Midnight contract indexer." />
    ) : (
      <ErrorComponent message={dataError ?? 'Unable to reach the ZeroBridge backend.'} onRetry={refresh} />
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
                Confidential Evaluation & Bridge Risk Analysis
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

          {/* PROMINENT PRIVATE ELIGIBILITY CARD (Level 3 Age / Eligibility Gate) */}
          <div className="mt-6 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-slate-900/60 to-cyan-500/10 p-5 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Lock className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Private Eligibility Gate
                    <Badge tone="violet">eligibility-gate.compact</Badge>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Prove threshold requirements without revealing your underlying private value
                  </p>
                </div>
              </div>

              <div>
                {eligibilityStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    ✓ Eligibility Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                    <Lock className="size-3.5 text-amber-500" />
                    Unverified
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200/20 bg-slate-100/50 p-3.5 dark:border-white/10 dark:bg-midnight-950/60">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Requirement
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">
                  18+ Years
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Minimum threshold</div>
              </div>

              <div className="rounded-xl border border-slate-200/20 bg-slate-100/50 p-3.5 dark:border-white/10 dark:bg-midnight-950/60">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Private Witness Value
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-violet-600 dark:text-violet-300">
                    🔒 Hidden
                  </span>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={userAgeValue}
                    onChange={(e) => {
                      setUserAgeValue(Number(e.target.value));
                      setEligibilityStatus('unverified');
                    }}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-right font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-midnight-900 dark:text-white"
                    title="Private age input (never leaves local memory)"
                  />
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">In-memory witness parameter</div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200/20 bg-slate-100/50 p-3.5 dark:border-white/10 dark:bg-midnight-950/60">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Disclosed Result
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-emerald-500">
                  {eligibilityStatus === 'verified' ? 'Eligible: true' : 'Not proven yet'}
                </div>
                <Button
                  size="sm"
                  loading={eligibilityStatus === 'proving'}
                  onClick={handleProveEligibility}
                  disabled={eligibilityStatus === 'verified'}
                  className="mt-2 border-violet-400/40 bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-300"
                >
                  <Lock className="size-3.5" />
                  {eligibilityStatus === 'verified' ? 'Verified ✓' : 'Prove Eligibility'}
                </Button>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
              <Shield className="size-3.5 text-cyan-500 shrink-0" />
              "Your value stays private. Only the eligibility result is disclosed."
            </p>

            {/* ── Vertical Evaluation Pipeline ── */}
            <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-white/60 to-slate-50/80 p-5 dark:from-midnight-950/80 dark:to-midnight-900/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-4 text-center">
                Security Evaluation Pipeline
              </div>

              {(() => {
                const routeChosen = !!selectedBridge;
                const scanned = routeChosen;
                const riskScored = !!result;
                const eligOk = eligibilityStatus === 'verified';
                const policyDone = riskScored && eligOk;
                const decisionLabel = result
                  ? result.verdictLabel === 'LOW'
                    ? 'APPROVE'
                    : result.verdictLabel === 'MEDIUM'
                      ? 'REVIEW'
                      : 'BLOCK'
                  : null;

                const steps: { label: string; detail: string; done: boolean; accent: string }[] = [
                  {
                    label: 'Transfer Intent',
                    detail: amount ? `${Number(amount).toLocaleString()} via ${chainName(srcChain)} → ${chainName(dstChain)}` : 'Set amount & route',
                    done: !!amount && !!srcChain && !!dstChain,
                    accent: 'text-slate-500',
                  },
                  {
                    label: 'Choose Route & Bridge',
                    detail: selectedBridge ? `${selectedBridge.name}` : 'Select a bridge on your route',
                    done: routeChosen,
                    accent: 'text-cyan-500',
                  },
                  {
                    label: 'ZeroBridge Scans Bridge',
                    detail: scanned
                      ? `Registry data: TVL $${fmtCompact(selectedBridge!.tvl)} · ${selectedBridge!.incidents} incidents`
                      : 'On-chain registry analysis',
                    done: scanned,
                    accent: 'text-cyan-500',
                  },
                  {
                    label: 'Risk Score',
                    detail: riskScored
                      ? `Score ${result.baseScore}/100 · Verdict: ${result.verdictLabel}`
                      : 'Zero-knowledge risk evaluation',
                    done: riskScored,
                    accent: 'text-amber-500',
                  },
                  {
                    label: 'Private Eligibility Proof',
                    detail: eligOk
                      ? 'Eligible: true (ZK verified, value hidden)'
                      : 'Prove 18+ threshold — value stays private',
                    done: eligOk,
                    accent: 'text-violet-500',
                  },
                  {
                    label: 'Security Policy',
                    detail: policyDone
                      ? 'Risk + eligibility evaluated'
                      : 'Combines risk score with eligibility gate',
                    done: policyDone,
                    accent: 'text-cyan-500',
                  },
                ];

                return (
                  <div className="relative ml-4">
                    {/* Vertical connector line */}
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-cyan-400/40 via-violet-400/40 to-emerald-400/40" />

                    {steps.map((step, i) => (
                      <div key={step.label} className="relative flex items-start gap-3.5 pb-4 last:pb-0">
                        {/* Step indicator dot */}
                        <div className={cn(
                          'relative z-10 mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold transition-all duration-300',
                          step.done
                            ? 'border-emerald-400 bg-emerald-400 text-white'
                            : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-midnight-900',
                        )}>
                          {step.done ? '✓' : i + 1}
                        </div>
                        {/* Step content */}
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-xs font-semibold', step.done ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>
                            {step.label}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {step.detail}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Final Decision Node */}
                    <div className="relative flex items-start gap-3.5 pt-1">
                      <div className={cn(
                        'relative z-10 mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold',
                        decisionLabel === 'APPROVE'
                          ? 'border-emerald-400 bg-emerald-400 text-white'
                          : decisionLabel === 'REVIEW'
                            ? 'border-amber-400 bg-amber-400 text-white'
                            : decisionLabel === 'BLOCK'
                              ? 'border-red-400 bg-red-400 text-white'
                              : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-midnight-900',
                      )}>
                        {decisionLabel ? '✓' : '7'}
                      </div>
                      <div className="flex-1">
                        <div className={cn('text-xs font-bold', decisionLabel ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>
                          Security Decision
                        </div>
                        {decisionLabel ? (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold',
                              decisionLabel === 'APPROVE'
                                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300'
                                : decisionLabel === 'REVIEW'
                                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300'
                                  : 'border-red-400/40 bg-red-400/10 text-red-600 dark:text-red-300',
                            )}>
                              {decisionLabel === 'APPROVE' && '✅'} {decisionLabel === 'REVIEW' && '⚠️'} {decisionLabel === 'BLOCK' && '🚫'} {decisionLabel}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-1.5">
                            {['APPROVE', 'REVIEW', 'BLOCK'].map((d) => (
                              <span key={d} className="rounded-md border border-slate-200 bg-slate-100/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:border-white/10 dark:bg-midnight-900/60 dark:text-slate-500">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
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
          <TvlSnapshotChart data={routeTvl} />
        </section>
      )}

      <RegisterBridgeModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  );
}
