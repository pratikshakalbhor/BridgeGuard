import { Link } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiCpu, FiEyeOff, FiShield, FiZap } from 'react-icons/fi';
import { TbApi, TbBrandReact, TbChartLine, TbLock, TbServer, TbShieldLock } from 'react-icons/tb';
import { Reveal } from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { Badge } from '@/components/ui/Badge';
import type { IconType } from 'react-icons';

interface Pillar {
  icon: IconType;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: FiEyeOff,
    title: 'Zero-knowledge privacy',
    body: 'Transfer amounts and personal risk tolerance are consumed inside Midnight proofs. The ledger only ever sees a coarse verdict.',
  },
  {
    icon: FiCpu,
    title: 'On-chain trust',
    body: 'Bridge registry, risk scores and status flags are transparent smart-contract state anyone can verify.',
  },
  {
    icon: FiZap,
    title: 'Real-time intelligence',
    body: 'A confidential intel-feed witness sharpens verdicts without leaking its inputs to any observer.',
  },
  {
    icon: FiShield,
    title: 'Human-readable verdicts',
    body: 'LOW, MEDIUM, HIGH and CRITICAL verdicts plus tolerance checks make security actionable for every user.',
  },
];

const STACK: { icon: IconType; name: string; role: string }[] = [
  { icon: TbBrandReact, name: 'React + TypeScript + Vite', role: 'Frontend shell' },
  { icon: TbShieldLock, name: 'Midnight Compact', role: 'ZK smart contract' },
  { icon: TbLock, name: 'Zero-knowledge proofs', role: 'evaluateBridge circuit' },
  { icon: TbChartLine, name: 'Recharts', role: 'Analytics visualisation' },
  { icon: TbApi, name: 'Node API server', role: 'Wallet + indexer bridge' },
  { icon: TbServer, name: 'LevelDB private state', role: 'Encrypted local store' },
];

const FUNCTIONS = [
  {
    name: 'registerBridge',
    signature: '(name, srcChain, dstChain, tvl, audited, incidents)',
    note: 'Writes a transparent registry entry for a bridge.',
  },
  {
    name: 'evaluateBridge',
    signature: '(bridgeId, amount, maxRisk)',
    note: 'Private ZK evaluation — consumes the getRiskIntel witness.',
  },
  {
    name: 'flagBridge',
    signature: '(bridgeId, status)',
    note: 'Marks a bridge ACTIVE / FLAGGED / COMPROMISED on-chain.',
  },
];

export function About() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <Reveal>
        <section className="card relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative">
            <Badge tone="cyan" className="px-4 py-1.5">
              <TbShieldLock className="size-3.5" /> About BridgeGuard AI
            </Badge>
            <h1 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Privacy-preserving bridge security,
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                {' '}
                verified on Midnight.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">
              BridgeGuard AI is a hackathon-built security layer for cross-chain bridges. It
              evaluates bridge risk — audit status, incidents, liquidity exposure and a
              confidential intelligence feed — inside zero-knowledge circuits, then records
              only a coarse, verifiable verdict on the Midnight ledger. Your numbers stay
              yours; the proof is public.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app/analyze" className="btn-primary">
                Run an analysis
              </Link>
              <Link to="/app" className="btn-outline">
                <FiArrowLeft className="size-4" />
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Pillars */}
      <section>
        <Reveal>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Why it exists</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Four principles drive every decision in the product.
          </p>
        </Reveal>
        <Stagger className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <StaggerItem key={p.title}>
              <div className="card group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-400 transition-colors group-hover:from-cyan-400 group-hover:to-violet-500 group-hover:text-white">
                  <p.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{p.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Contract functions */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="card h-full p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Smart contract surface
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Every function from <code className="font-mono text-xs">bridgeguard-v2.compact</code>{' '}
              is wired into the UI.
            </p>
            <div className="mt-5 space-y-3">
              {FUNCTIONS.map((fn) => (
                <div
                  key={fn.name}
                  className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/[0.07] dark:bg-midnight-900/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-sm font-bold text-cyan-500">{fn.name}</code>
                    <Badge tone="violet">live</Badge>
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {fn.signature}
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <FiCheckCircle className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                    {fn.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card h-full p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Built with
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {STACK.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-white/[0.07]"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400/15 to-violet-500/15 text-cyan-400">
                    <t.icon className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 text-xs text-violet-600 dark:text-violet-300">
              Built for the Midnight SPPU bootcamp — a first-of-its-kind privacy layer for
              cross-chain bridge intelligence.
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
