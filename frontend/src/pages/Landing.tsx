import { Link } from 'react-router-dom';
import {
  ArrowRight,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  Search,
  ShieldAlert,
  Wallet,
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
    icon: Search,
    title: 'Private Risk Analysis',
    body: 'Evaluate cross-chain transfer risk with your exact amount and personal tolerance — both stay private in zero-knowledge proofs.',
  },
  {
    icon: Lock,
    title: 'Local Zero-Knowledge Proofs',
    body: 'Proofs are generated in your browser via 1AM or Lace wallet. Private inputs never leave your device or touch any server.',
  },
  {
    icon: EyeOff,
    title: 'Private Eligibility Verification',
    body: 'Prove you meet threshold requirements (e.g., age 18+) without revealing the underlying value — only the boolean result is disclosed.',
  },
  {
    icon: ShieldAlert,
    title: 'Cross-Chain Security Monitoring',
    body: 'Real-time bridge registry status, incident flags, and liquidity health from the Midnight contract ledger.',
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
    title: 'Select your route',
    body: 'Choose source chain, destination chain, and a registered bridge. View public TVL, audit status, and incident history.',
    icon: Search,
  },
  {
    number: '02',
    title: 'Enter private parameters',
    body: 'Set your transfer amount, risk tolerance, and confidential intel. These values are used locally for ZK proving only.',
    icon: Lock,
  },
  {
    number: '03',
    title: 'Generate proof in wallet',
    body: 'Your Midnight wallet (1AM/Lace) generates the zero-knowledge proof locally. You approve the transaction and pay the DUST fee.',
    icon: Wallet,
  },
  {
    number: '04',
    title: 'Get coarse verdict',
    body: 'The ledger discloses only: LOW/MEDIUM/HIGH/CRITICAL verdict and whether it fits your tolerance. Exact inputs remain hidden.',
    icon: Zap,
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
              Privacy-preserving security for cross-chain DeFi
            </Badge>
          </div>
          <h1
            className="mt-6 animate-fade-up text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-6xl"
            style={{ animationDelay: '80ms' }}
          >
            ZeroBridge
          </h1>
          <p
            className="mt-4 animate-fade-up text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl"
            style={{ animationDelay: '160ms' }}
          >
            Analyze cross-chain transfer risk while keeping sensitive financial information private.
          </p>
          <div
            className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '240ms' }}
          >
            <Link to="/app" className="btn-primary w-full px-8 py-3.5 text-base sm:w-auto">
              Launch App
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
            Zero-knowledge proofs · Midnight Preprod · Private inputs processed locally in your browser
          </p>
        </div>

        {/* hero metrics */}
        <div
          className="mx-auto mt-16 grid max-w-4xl animate-fade-up grid-cols-1 gap-4 sm:grid-cols-4"
          style={{ animationDelay: '400ms' }}
        >
          {[
            { value: '100%', label: 'Private inputs stay local' },
            { value: '4', label: 'Verdict tiers' },
            { value: '0', label: 'Amounts on ledger' },
            { value: '2', label: 'Supported wallets' },
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
          <span className="section-eyebrow">Core Features</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Privacy-preserving security you can verify
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Every ZeroBridge feature is grounded in on-chain facts and zero-knowledge proofs — nothing to take on faith.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
              From route selection to a proof-backed verdict
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

      {/* ── Privacy Model ────────────────────────────────────────────────── */}
      <section id="privacy" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="section-eyebrow">
              <EyeOff className="size-3.5" /> Privacy Model
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Your sensitive data stays private.
              <br />
              Only the coarse verdict becomes public.
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
              Midnight separates what is public from what is private. The registry — bridge metadata, risk scores, status
              flags, and coarse verdict history — is transparent to everyone. The inputs that matter to you — transfer amount,
              risk tolerance, and the confidential intel feed — are consumed inside the proof and never leave your browser.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Public: bridge registry, risk scores, status flags, coarse verdicts',
                'Private: transfer amounts, risk tolerances, intel feed witness',
                'Revealed: only a coarse verdict (LOW/MEDIUM/HIGH/CRITICAL) and tolerance fit',
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
              Connect to the Midnight Preprod dashboard, register or select a bridge, and get a
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