import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function ComingSoon() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo withText={false} />
      <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-400">
        <Construction className="size-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Dashboard is next
      </h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
        The BridgeGuard AI dashboard — wallet info, risk scores, liquidity health and
        AI recommendations — is the next step after you approve the landing page.
      </p>
      <Link to="/" className="btn-outline">
        <ArrowLeft className="size-4" />
        Back to landing
      </Link>
    </div>
  );
}
