import { Link } from 'react-router-dom';
import { Github, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';

const FOOTER_LINKS = {
  Product: [
    { label: 'Dashboard', to: '/app' },
    { label: 'Bridge Analysis', to: '/app/analyze' },
    { label: 'AI Transfer Advisor', to: '/app/advisor' },
    { label: 'Security Alerts', to: '/app/alerts' },
    { label: 'Wallet', to: '/app/wallet' },
    { label: 'About', to: '/app/about' },
  ],
  Technology: [
    { label: 'Midnight Blockchain', to: '/app/about' },
    { label: 'Zero-Knowledge Proofs', to: '/app/about' },
    { label: 'Privacy Model', to: '/app/about' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-midnight-900/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Privacy-preserving cross-chain bridge security intelligence, verified
              on the Midnight blockchain with zero-knowledge proofs.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                <ShieldCheck className="size-3.5" /> Midnight Builder Program
              </span>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {group}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-slate-600 transition-colors hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 dark:border-white/[0.08] pt-6 sm:flex-row">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} ZeroBridge. Privacy-preserving security for cross-chain DeFi.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
            <span>Zero-knowledge verified</span>
            <span className="hidden sm:inline">·</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-cyan-500"
            >
              <Github className="size-3.5" /> Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
