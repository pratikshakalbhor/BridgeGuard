import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Cpu,
  EyeOff,
  FileCheck2,
  Gauge,
  Lock,
  ShieldCheck,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Reveal } from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: EyeOff,
    title: 'Zero-knowledge evaluations',
    body: 'Transfer amounts and your personal risk tolerance are proved in zero knowledge on Midnight — never revealed to the ledger or any observer.',
  },
  {
    icon: Gauge,
    title: 'On-chain risk scores',
    body: 'Every bridge carries a transparent, auditable risk score derived from audit status, public incidents, and liquidity exposure.',
  },
  {
    icon: Waves,
    title: 'Liquidity health signals',
    body: 'Track total value locked and exposure thresholds so you can spot thin-liquidity bridges before you move assets across them.',
  },
  {
    icon: Bell,
    title: 'Real-time bridge alerts',
    body: 'Flag compromised or degraded bridges the moment status changes on-chain, with coarse verdict history stored publicly.',
  },
  {
    icon: Lock,
    title: 'Private intel feed',
    body: 'A confidential incident-intelligence witness sharpens verdicts without leaking the underlying data to anyone.',
  },
  {
    icon: Cpu,
    title: 'Built on Midnight',
    body: 'Leverages Midnight’s privacy-preserving smart contracts and zero-knowledge proofs for a first-of-its-kind security layer.',
  },
];

interface Step {
  number: string;
  title: string;
  body: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Register a bridge',
    body: 'Add bridge metadata — source/destination chains, TVL, audit status and public incident count — as a transparent on-chain record.',
    icon: FileCheck2,
  },
  {
    number: '02',
    title: 'Run a private evaluation',
    body: 'Enter your transfer amount and personal risk tolerance. A zero-knowledge circuit combines them with the bridge score and the confidential intel feed.',
    icon: ShieldCheck,
  },
  {
    number: '03',
    title: 'Verify the verdict',
    body: 'The ledger records only a coarse verdict — LOW, MEDIUM, HIGH or CRITICAL — and whether it fit your tolerance. The inputs stay hidden.',
    icon: Zap,
  },
  {
    number: '04',
    title: 'Move with confidence',
    body: 'Decide with a clear, proof-backed recommendation instead of guessing about bridge security and liquidity health.',
    icon: Sparkles,
  },
];

export function Landing() {
  return (
    <div id="top" className="relative min-h-screen bg-grid-faint">
      <div className="pointer-events-none fixed inset-0 bg-hero-glow" aria-hidden="true" />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 pt-36 pb-20 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-up">
            <Badge tone="cyan" className="px-4 py-1.5">
              <Sparkles className="size-3.5" />
              Privacy-preserving bridge intelligence
            </Badge>
          </div>
          <h1
            className="mt-6 animate-fade-up text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-6xl"
            style={{ animationDelay: '80ms' }}
          >
            Know your bridge.
            <br />
            Before you{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              move your assets.
            </span>
          </h1>
          <p
            className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg"
            style={{ animationDelay: '160ms' }}
          >
            BridgeGuard AI evaluates cross-chain bridge security, liquidity health and
            transfer risk — then proves the verdict on the Midnight blockchain without
            ever revealing your amounts or tolerance.
          </p>
          <div
            className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '240ms' }}
          >
            <Link to="/app" className="btn-primary w-full px-8 py-3.5 text-base sm:w-auto">
              Launch dashboard
              <ArrowRight className="size-4.5" />
            </Link>
            <a href="#how-it-works" className="btn-outline w-full px-8 py-3.5 text-base sm:w-auto">
              See how it works
            </a>
          </div>
          <p
            className="mt-6 animate-fade-up text-xs text-slate-400 dark:text-slate-500"
            style={{ animationDelay: '320ms' }}
          >
            Zero-knowledge proofs · Midnight Preview · Sensitive inputs stay off-chain.
          </p>
        </div>

        {/* hero metrics */}
        <div
          className="mx-auto mt-16 grid max-w-4xl animate-fade-up grid-cols-1 gap-4 sm:grid-cols-3"
          style={{ animationDelay: '400ms' }}
        >
          {[
            { value: '100%', label: 'Private inputs, always' },
            { value: '4', label: 'Coarse verdict tiers' },
            { value: '0', label: 'Amounts on the ledger' },
          ].map((m) => (
            <div
              key={m.label}
              className="glass rounded-2xl px-6 py-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{m.value}</div>
              <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Features</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Security intelligence you can verify, not just trust
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Every claim BridgeGuard makes is grounded in on-chain facts and zero-knowledge
            proofs — nothing to take on faith.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <div className="glass group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
                <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-500 transition-colors group-hover:from-cyan-400 group-hover:to-violet-500 group-hover:text-white">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative border-y border-slate-200 dark:border-white/[0.07] bg-white/40 py-24 dark:bg-midnight-900/40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-eyebrow">How it works</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              From metadata to a proof-backed verdict
            </h2>
          </div>

          <Stagger className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
            {STEPS.map((step) => (
              <StaggerItem key={step.number} className="relative">
                <div className="glass h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-violet">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-mono text-3xl font-extrabold text-slate-300 dark:text-white/10">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {step.body}
                  </p>
                </div>
                {step.number !== '04' && (
                  <ArrowRight className="absolute -right-4 top-1/2 hidden size-5 -translate-y-1/2 text-cyan-400/50 lg:block" />
                )}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <section id="privacy" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="section-eyebrow">
              <EyeOff className="size-3.5" /> Privacy model
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Your numbers stay private.
              <br />
              The proof is public.
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
              Midnight separates what is public from what is private better than any
              bridge explorer today. The registry — bridge metadata, risk scores, status
              and coarse verdict history — is transparent to everyone. The inputs that
              matter to you — transfer amount, risk tolerance, and the confidential intel
              feed — are consumed inside the proof and never leave it.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Public: bridge registry, risk scores, status flags',
                'Private: amounts, tolerances, and the intel witness',
                'Revealed: only a coarse verdict and tolerance fit',
              ].map((row) => (
                <li key={row} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-400" />
                  {row}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-3xl p-8 shadow-card">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <span>Ledger state</span>
              <span className="inline-flex items-center gap-1.5 text-cyan-500">
                <Waves className="size-3.5" /> Midnight
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { label: 'Bridge registry', value: 'Public', tone: 'text-cyan-400' },
                { label: 'Risk score', value: 'Public', tone: 'text-cyan-400' },
                { label: 'Status flags', value: 'Public', tone: 'text-cyan-400' },
                { label: 'Verdict history', value: 'Coarse, public', tone: 'text-cyan-400' },
                { label: 'Transfer amount', value: 'Zero-knowledge', tone: 'text-violet-300' },
                { label: 'Risk tolerance', value: 'Zero-knowledge', tone: 'text-violet-300' },
                { label: 'Intel feed', value: 'Zero-knowledge', tone: 'text-violet-300' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]"
                >
                  <span className="text-sm text-slate-600 dark:text-slate-300">{row.label}</span>
                  <span className={`flex items-center gap-2 text-xs font-semibold ${row.tone}`}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/15 via-midnight-800 to-violet-600/20 p-10 text-center shadow-card sm:p-16">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative">
            <span className="section-eyebrow">Get started</span>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Run your first confidential bridge evaluation today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300">
              Connect to the Midnight Preview dashboard, register or select a bridge, and get a
              proof-backed risk verdict in under a minute.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/app" className="btn-primary px-8 py-3.5 text-base">
                Enter the dashboard
                <ArrowRight className="size-4.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
