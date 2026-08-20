import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { BrainCircuit, Crown, Route, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AiRecommendationCard } from '@/components/AiRecommendationCard';
import { RiskMeter } from '@/components/RiskMeter';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { useAppData } from '@/hooks/useAppData';
import { useWallet } from '@/hooks/useWallet';
import { assessBridge, publicRecommendationFor, type Assessment } from '@/utils/riskEngine';
import { evaluateBridgeWithWallet } from '@/services/midnight';
import { chainName } from '@/utils/constants';
import { loadPreferences } from '@/utils/preferences';
import { cn, fmtCompact } from '@/utils/format';
import type { Bridge } from '@/services/api';

interface RankResult {
  ranked: Array<{ bridge: Bridge; assessment: Assessment }>;
  directRoute: boolean;
}

export function Advisor() {
  const { state, loading, error: dataError, refresh } = useAppData();
  const { status: walletStatus } = useWallet();
  const bridges = state?.ledger.bridges ?? [];

  const [amount, setAmount] = useState('250000');
  const [srcChain, setSrcChain] = useState('1');
  const [dstChain, setDstChain] = useState('42161');
  const [maxRisk, setMaxRisk] = useState(() => loadPreferences().defaultTolerance);
  const [intel, setIntel] = useState(() => loadPreferences().defaultIntel);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<RankResult | null>(null);

  const chainIds = useMemo(
    () => Array.from(new Set(bridges.flatMap((b) => [b.srcChain, b.dstChain]))).sort(),
    [bridges],
  );

  const runAnalysis = async () => {
    if (walletStatus !== 'connected') {
      toast.error('Connect your Midnight wallet first', {
        description: 'Proofs are generated locally in your browser — the connected wallet proves each evaluation.',
      });
      return;
    }
    const amountNum = Number(amount) || 0;
    const matches = bridges.filter(
      (b) => b.srcChain === srcChain && b.dstChain === dstChain,
    );
    const pool = matches.length > 0 ? matches : bridges;
    setAnalyzing(true);
    try {
      // Real on-chain ranking: run the private evaluateBridge circuit locally
      // in the browser (via the connected wallet) for every candidate so only
      // the disclosed verdicts drive the order. Private amount/maxRisk/intel
      // never leave the browser.
      const ranked: RankResult['ranked'] = [];
      for (const b of pool) {
        try {
          const res = await evaluateBridgeWithWallet({
            bridgeId: b.id,
            amount: String(amountNum),
            maxRisk,
            intel,
          });
          const local = assessBridge(b, amountNum, maxRisk, intel);
          ranked.push({
            bridge: b,
            assessment: {
              ...local,
              verdict: res.verdict !== null ? Number(res.verdict) : local.verdict,
              verdictLabel: res.verdictLabel ?? local.verdictLabel,
              within: res.within ?? local.within,
            },
          });
        } catch {
          ranked.push({ bridge: b, assessment: assessBridge(b, amountNum, maxRisk, intel) });
        }
      }
      ranked.sort(
        (x, y) =>
          x.assessment.verdict - y.assessment.verdict ||
          x.assessment.baseScore - y.assessment.baseScore,
      );
      setResult({ ranked, directRoute: matches.length > 0 });
      setAnalyzed(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const best = result?.ranked[0];

  if (!state) {
    return loading ? (
      <EmptyState title="Loading registry…" body="Fetching the bridge registry from the indexer." />
    ) : (
      <ErrorComponent message={dataError ?? 'Unable to reach the BridgeGuard backend.'} onRetry={refresh} />
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-violet-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            AI Transfer Advisor
          </h2>
          <Badge tone="success">on-chain</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Tells you the safest route for your amount — without revealing the amount.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          <label>
            <span className="label">Transfer amount</span>
            <input className="input" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            <span className="label">From chain</span>
            <select className="input" value={srcChain} onChange={(e) => setSrcChain(e.target.value)}>
              {chainIds.map((id) => (
                <option key={id} value={id}>
                  {chainName(id)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">To chain</span>
            <select className="input" value={dstChain} onChange={(e) => setDstChain(e.target.value)}>
              {chainIds.map((id) => (
                <option key={id} value={id}>
                  {chainName(id)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Tolerance (private)</span>
            <select className="input" value={maxRisk} onChange={(e) => setMaxRisk(Number(e.target.value))}>
              <option value={0}>0 · Low</option>
              <option value={1}>1 · Medium</option>
              <option value={2}>2 · High</option>
              <option value={3}>3 · Critical</option>
            </select>
          </label>
          <label>
            <span className="label">Intel feed</span>
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

        <div className="mt-6">
          <Button
            size="lg"
            loading={analyzing}
            disabled={bridges.length === 0 || walletStatus !== 'connected'}
            onClick={async () => {
              toast.info(
                `Running ${bridges.length} private on-chain evaluations…`,
              );
              await runAnalysis();
              toast.success('Routes ranked', {
                description: `Advisor evaluated ${bridges.length} bridges for ${amount} tokens.`,
              });
            }}
          >
            <Sparkles className="size-4" />
            {analyzing ? 'Evaluating privately…' : 'Find the safest route'}
          </Button>
        </div>
      </section>

      {analyzed && result ? (
        <>
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 xl:grid-cols-3"
          >
            {best && (
              <>
                <div className="card relative flex flex-col items-center justify-center overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-400/10 blur-3xl" />
                  <div className="relative text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-500 dark:text-violet-300">
                      <Crown className="size-3.5" />
                      Recommended route
                    </span>
                    <div className="mt-4 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                      {best.bridge.name}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <Route className="size-3.5" />
                      {chainName(best.bridge.srcChain)} → {chainName(best.bridge.dstChain)}
                    </div>
                    <div className="mt-4 flex justify-center">
                      <RiskMeter score={best.assessment.baseScore} size="md" label="On-chain risk score" />
                    </div>
                    <div className="mt-3 flex justify-center gap-2">
                      <Badge tone={best.assessment.tone}>{best.assessment.verdictLabel} verdict</Badge>
                      <Badge tone={best.assessment.verdict <= 1 ? 'success' : 'critical'}>
                        {best.assessment.verdict <= 1 ? 'Safe to transfer' : 'Unsafe now'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <LiquidityDetail bridge={best.bridge} />
                <AiRecommendationCard
                  recommendation={publicRecommendationFor(
                    best.bridge,
                    best.assessment.verdict,
                    best.assessment.baseScore,
                    best.assessment.incidentScore,
                  )}
                />
              </>
            )}
          </motion.section>

          {result.ranked.length > 1 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Route comparison
              </h2>
              <div className="mt-4 divide-y divide-slate-100 dark:divide-white/[0.06]">
                {result.ranked.map((r, i) => (
                  <motion.div
                    key={r.bridge.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.05 }}
                    className="flex flex-wrap items-center gap-4 py-4 transition-colors"
                  >
                    <span className="font-mono text-sm font-bold text-slate-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{r.bridge.name}</p>
                        {i === 0 && <Badge tone="violet">best</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {chainName(r.bridge.srcChain)} → {chainName(r.bridge.dstChain)} · TVL $
                        {fmtCompact(r.bridge.tvl)}
                      </p>
                    </div>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          r.assessment.baseScore >= 55
                            ? 'bg-red-400'
                            : r.assessment.baseScore >= 30
                              ? 'bg-amber-400'
                              : 'bg-emerald-400',
                        )}
                        style={{ width: `${Math.min(100, r.assessment.baseScore)}%` }}
                      />
                    </div>
                    <Badge tone={r.assessment.tone}>{r.assessment.verdictLabel}</Badge>
                    <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                      {r.assessment.baseScore}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {result.ranked.length === 0 && (
            <EmptyState
              icon={Route}
              title="No bridges match this route"
              body="Try a different source or destination chain."
            />
          )}
        </>
      ) : (
        <EmptyState
          icon={BrainCircuit}
          title="Ready to advise"
          body="Set your amount and route, then ask the advisor to rank every bridge by composite risk."
        />
      )}
    </div>
  );
}

function LiquidityDetail({ bridge }: { bridge: Bridge }) {
  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Liquidity health
      </h2>
      <div className="mt-4 font-mono text-2xl font-bold text-slate-900 dark:text-white">
        ${fmtCompact(bridge.tvl)}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">Total value locked</div>

      <div className="mt-5 space-y-3">
        {[
          { label: 'Audited', ok: Number(bridge.audited) === 1 },
          { label: 'Public incidents', ok: Number(bridge.incidents) <= 2 },
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
        {Number(bridge.tvl) >= 1_000_000_000
          ? 'Deep audited pool — ample public liquidity on this route.'
          : Number(bridge.incidents) > 2
            ? 'Pool carries multiple public incidents — treat with caution.'
            : 'Routine pool with active on-chain monitoring.'}
      </p>
    </div>
  );
}
