import { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Boxes,
  Flag,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Waves,
  BrainCircuit,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { MotionCard } from '@/components/motion/MotionCard';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { Reveal } from '@/components/motion/Reveal';
import { StatCard } from '@/components/StatCard';
import { WalletCard } from '@/components/WalletCard';
import { AlertCard } from '@/components/AlertCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { RiskDonutChart } from '@/components/charts/RiskDonutChart';
import { VerdictByBridgeChart } from '@/components/charts/VerdictByBridgeChart';
import { RiskGauge } from '@/components/charts/RiskGauge';
import { AiRecommendationCard } from '@/components/AiRecommendationCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAppData } from '@/hooks/useAppData';
import { useWallet } from '@/hooks/useWallet';
import { assessBridge, recommendationFor } from '@/utils/riskEngine';
import { chainName } from '@/utils/constants';
import { fmtNumber } from '@/utils/format';
import { cn } from '@/utils/format';
import {
  deriveAlerts,
  deriveEvents,
  deriveVerdictByBridge,
  deriveVerdictDistribution,
} from '@/utils/deriveData';
import { getLiquidityHealth } from '@/services/midnight';

const VERDICT_BADGE: Record<number, 'success' | 'warning' | 'danger' | 'critical' | 'neutral'> = {
  0: 'success',
  1: 'warning',
  2: 'danger',
  3: 'critical',
};

const VERDICT_STATCARD: Record<number, 'success' | 'warning' | 'danger'> = {
  0: 'success',
  1: 'warning',
  2: 'danger',
  3: 'danger',
};

const EVENT_META: Record<string, { tone: 'cyan' | 'violet' | 'warning' | 'danger'; icon: typeof Flag }> = {
  register: { tone: 'cyan', icon: Boxes },
  evaluate: { tone: 'violet', icon: Activity },
  flag: { tone: 'danger', icon: Flag },
  liquidity: { tone: 'warning', icon: Waves },
};

export function Dashboard() {
  const { state, loading, error, refresh } = useAppData();
  const { address: laceAddress } = useWallet();
  const [showAllEvents, setShowAllEvents] = useState(false);

  const alerts = useMemo(() => (state ? deriveAlerts(state) : []), [state]);
  const events = useMemo(() => (state ? deriveEvents(state) : []), [state]);
  const verdictDistribution = useMemo(
    () => (state ? deriveVerdictDistribution(state) : []),
    [state],
  );
  const verdictByBridge = useMemo(() => (state ? deriveVerdictByBridge(state) : []), [state]);

  const openAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'open').length,
    [alerts],
  );
  const latestVerdictNum = Number(state?.ledger.lastVerdict ?? 0);
  const worst = useMemo(
    () =>
      state
        ? [...state.ledger.latestVerdicts].sort((a, b) => Number(b.value) - Number(a.value))[0]
        : undefined,
    [state],
  );

  const compositeRisk = useMemo(() => {
    if (!state || state.ledger.bridges.length === 0) return 0;
    return Math.round(
      state.ledger.bridges.reduce((acc, b) => acc + Number(b.riskScore), 0) /
        state.ledger.bridges.length,
    );
  }, [state]);

  const liquidityHealth = useMemo(() => {
    if (!state || state.ledger.bridges.length === 0) return 0;
    const total = state.ledger.bridges.reduce((acc, b) => acc + getLiquidityHealth(b).score, 0);
    return Math.round(total / state.ledger.bridges.length);
  }, [state]);

  const securityStatus = useMemo(() => {
    const bridges = state?.ledger.bridges ?? [];
    const compromised = bridges.some((b) => Number(b.status) === 2);
    const flagged = bridges.some((b) => Number(b.status) === 1);
    if (compromised) return { label: 'Compromise detected', tone: 'critical' as const };
    if (flagged) return { label: 'Elevated watch', tone: 'warning' as const };
    return { label: 'All systems nominal', tone: 'success' as const };
  }, [state]);

  const worstBridge = useMemo(
    () => state?.ledger.bridges.find((b) => b.id === worst?.key),
    [state, worst],
  );
  const recommendation = useMemo(() => {
    if (!worstBridge) return null;
    return recommendationFor(assessBridge(worstBridge, 50_000, 2, 2));
  }, [worstBridge]);

  const visibleEvents = showAllEvents ? events : events.slice(0, 4);
  const topBridges = useMemo(() => {
    const bridges = state?.ledger.bridges ?? [];
    const byVerdict = new Map(
      (state?.ledger.latestVerdicts ?? []).map((v) => [v.key, Number(v.value)]),
    );
    return [...bridges]
      .sort((a, b) => (byVerdict.get(a.id) ?? 0) - (byVerdict.get(b.id) ?? 0))
      .slice(0, 5);
  }, [state]);

  if (!state) {
    return loading ? (
      <EmptyState title="Loading registry…" body="Reading bridge state from the Midnight contract." />
    ) : (
      <ErrorComponent message={error ?? 'Unable to reach the BridgeGuard backend.'} onRetry={refresh} />
    );
  }

  const { ledger, balance, walletAddress, network } = state;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Bridges registered"
            value={<AnimatedCounter value={Number(ledger.registryCount)} />}
            icon={Boxes}
            tone="cyan"
            loading={loading}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Confidential assessments"
            value={<AnimatedCounter value={Number(ledger.assessmentCount)} />}
            sub="on-chain"
            icon={Activity}
            tone="violet"
            loading={loading}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Open alerts"
            value={<AnimatedCounter value={openAlerts} />}
            sub="security + liquidity"
            icon={Bell}
            tone="danger"
            loading={loading}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Average risk score"
            value={<AnimatedCounter value={compositeRisk} />}
            sub="registry mean / 100"
            icon={Gauge}
            tone="warning"
            loading={loading}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Last verdict"
            value={ledger.lastVerdictLabel}
            sub={ledger.lastWithinTolerance ? 'within tolerance' : 'exceeds tolerance'}
            icon={ShieldCheck}
            tone={VERDICT_STATCARD[latestVerdictNum] ?? 'warning'}
            loading={loading}
          />
        </StaggerItem>
      </Stagger>

      {/* Wallet + risk gauge + recommendation */}
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WalletCard
            address={walletAddress}
            tNight={balance.tNight}
            dust={balance.dust}
            network={network}
            contractAddress={state.contractAddress}
            live={true}
            laceAddress={laceAddress}
            onRefresh={refresh}          />
        </div>
        <MotionCard className="card flex flex-col items-center justify-center p-6">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bridge risk score
            </h2>
          </div>
          {loading ? (
            <SkeletonLoader variant="chart" className="mt-4" />
          ) : (
            <div className="mt-4">
              <RiskGauge value={compositeRisk} label="Composite registry risk" />
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone={securityStatus.tone}>{securityStatus.label}</Badge>
            <Badge tone={liquidityHealth >= 60 ? 'success' : liquidityHealth >= 40 ? 'warning' : 'critical'}>
              Liquidity {liquidityHealth}/100
            </Badge>
          </div>
        </MotionCard>
      </section>

      {/* Recommendation + verdict distribution */}
      <section className="grid gap-6 xl:grid-cols-3">
        <MotionCard delay={0.05} className="xl:col-span-2">
          {recommendation ? (
            <AiRecommendationCard
              recommendation={recommendation}
              transferSafety={assessBridge(worstBridge!, 50_000, 2, 2).transferSafety}
            />
          ) : (
            <div className="card flex h-full items-center justify-center p-10 text-sm text-slate-500 dark:text-slate-400">
              No recommendation available yet.
            </div>
          )}
        </MotionCard>
        <MotionCard delay={0.1} className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verdict distribution
            </h2>
            <Badge tone="violet">on-chain</Badge>
          </div>
          {loading ? (
            <SkeletonLoader variant="chart" className="mt-4" />
          ) : (
            <RiskDonutChart data={verdictDistribution} />
          )}
        </MotionCard>
      </section>

      {/* Bridge health cards */}
      <section>
        <Reveal>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bridge health
            </h2>
            <Badge tone="cyan">{ledger.bridges.length} registered</Badge>
          </div>
        </Reveal>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-36" />
            ))}
          </div>
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topBridges.map((b, i) => {
              const health = getLiquidityHealth(b);
              const v = Number(ledger.latestVerdicts.find((x) => x.key === b.id)?.value ?? 0);
              return (
                <StaggerItem key={b.id}>
                  <div className="card group h-full p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900 dark:text-white">{b.name}</p>
                      <Badge tone={VERDICT_BADGE[v] ?? 'neutral'}>
                        {ledger.latestVerdicts.find((x) => x.key === b.id)?.label ?? '—'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {chainName(b.srcChain)} → {chainName(b.dstChain)}
                    </p>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                          ${fmtNumber(b.tvl)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          TVL
                        </div>
                      </div>
                      <span
                        className={cn(
                          'font-mono text-xs font-bold',
                          health.status === 'Healthy'
                            ? 'text-emerald-400'
                            : health.status === 'Stretched'
                              ? 'text-amber-400'
                              : 'text-red-400',
                        )}
                      >
                        {health.score}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          health.status === 'Healthy'
                            ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                            : health.status === 'Stretched'
                              ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                              : 'bg-gradient-to-r from-orange-400 to-red-400',
                        )}
                        style={{ width: `${health.score}%` }}
                      />
                    </div>
                    {i === 0 && (
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-violet-500 dark:text-violet-300">
                        <ShieldCheck className="size-3" /> Safest bridge
                      </div>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </section>

      {/* Analytics + events */}
      <section className="grid gap-6 xl:grid-cols-3">
        <MotionCard className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verdicts by bridge
            </h2>
            <Badge tone="cyan">on-chain</Badge>
          </div>
          <div className="mt-4">
            {loading ? (
              <SkeletonLoader variant="chart" />
            ) : verdictByBridge.length === 0 ? (
              <div className="card flex h-full items-center justify-center p-10 text-sm text-slate-500 dark:text-slate-400">
                No data available — no bridges registered yet.
              </div>
            ) : (
              <VerdictByBridgeChart data={verdictByBridge} />
            )}
          </div>
        </MotionCard>

        <MotionCard delay={0.1} className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent bridge events
            </h2>
            <Badge tone="neutral">{visibleEvents.length}</Badge>
          </div>
          <div className="space-y-1">
            {visibleEvents.map((ev) => {
              const meta = EVENT_META[ev.type];
              const Icon = meta.icon;
              return (
                <div key={ev.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-100/70 dark:hover:bg-white/[0.04]">
                  <div
                    className={cn(
                      'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                      meta.tone === 'danger' && 'bg-red-400/10 text-red-400',
                      meta.tone === 'warning' && 'bg-amber-400/10 text-amber-400',
                      meta.tone === 'violet' && 'bg-violet-400/10 text-violet-400',
                      meta.tone === 'cyan' && 'bg-cyan-400/10 text-cyan-400',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {ev.title}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{ev.detail}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {ev.timeAgo}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {events.length > 4 && (
            <Button variant="ghost" className="mt-3 w-full" onClick={() => setShowAllEvents((v) => !v)}>
              {showAllEvents ? 'Show fewer' : `Show all ${events.length}`}
            </Button>
          )}
        </MotionCard>
      </section>

      {/* Worst-rated + alerts */}
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Worst-rated bridge
            </h2>
          </div>
          {loading ? (
            <SkeletonLoader className="mt-4" />
          ) : (
            <div className="mt-4">
              {worst ? (
                <>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {worstBridge?.name ?? `Bridge #${worst.key}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={VERDICT_BADGE[Number(worst.value)] ?? 'neutral'}>{worst.label}</Badge>
                    <Badge tone={securityStatus.tone}>
                      <BrainCircuit className="size-3" /> {securityStatus.label}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {recommendation?.reason ?? 'This bridge carries the highest recent verdict. Avoid large transfers until its status changes on-chain.'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No assessments yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Latest alerts
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">{alerts.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.slice(0, 4).map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Wallet icon footnote */}
      <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 text-xs text-violet-600 dark:text-violet-300">
        <Wallet className="size-3.5 shrink-0" />
        Connect the Lace wallet from the Wallet page to enable on-chain balance reads and
        contract interactions with live proofs.
      </div>
    </div>
  );
}
