import { useState } from 'react';
import { Bell, Database, Network, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorComponent } from '@/components/ErrorComponent';
import { useAppData } from '@/hooks/useAppData';
import { useHealth } from '@/hooks/useHealth';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/format';
import {
  loadPreferences,
  savePreferences,
  type Preferences,
} from '@/utils/preferences';

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : 'bg-slate-300 dark:bg-white/10',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof Bell;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/15 to-violet-400/15 text-cyan-400">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{body}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Settings() {
  const { state, loading, error, refresh } = useAppData();
  const { report: health } = useHealth(15000);
  const { theme, toggleTheme } = useTheme();

  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [saved, setSaved] = useState(false);

  const save = async () => {
    savePreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    await refresh();
    toast.success('Settings saved', {
      description: `Default tolerance ${prefs.defaultTolerance} · intel ${prefs.defaultIntel} · notifications ${Object.values(prefs.notifications).filter(Boolean).length}/3 enabled`,
    });
  };

  if (!state) {
    return loading ? (
      <EmptyState title="Loading registry…" body="Connecting to the BridgeGuard backend." />
    ) : (
      <ErrorComponent message={error ?? 'Unable to reach the BridgeGuard backend.'} onRetry={refresh} />
    );
  }

  const services = health?.services ?? [];
  const allHealthy = services.length > 0 && services.every((s) => s.healthy);
  const backendOffline = services.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Defaults apply to every analysis; notifications control alert delivery.
          </p>
        </div>
        <Button onClick={save}>
          <Save className="size-4" />
          {saved ? 'Saved' : 'Save changes'}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          icon={ShieldCheck}
          title="Risk defaults"
          body="The tolerance and intel pressure used when you run an analysis."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="label">Default risk tolerance</span>
              <select
                className="input"
                value={prefs.defaultTolerance}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, defaultTolerance: Number(e.target.value) }))
                }
              >
                <option value={0}>0 · Low — only LOW verdicts</option>
                <option value={1}>1 · Medium — up to MEDIUM</option>
                <option value={2}>2 · High — up to HIGH</option>
                <option value={3}>3 · Critical — anything goes</option>
              </select>
            </label>
            <label>
              <span className="label">Default intel confidence</span>
              <input
                className="input"
                type="number"
                min="0"
                max="20"
                value={prefs.defaultIntel}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    defaultIntel: Math.max(0, Math.min(20, Number(e.target.value))),
                  }))
                }
              />
            </label>
          </div>
        </Section>

        <Section
          icon={Bell}
          title="Notifications"
          body="Choose which alerts push through to your feed."
        >
          <div className="space-y-3">
            {[
              {
                key: 'security' as const,
                label: 'Security alerts',
                desc: 'Flagged bridges and compromised registry entries',
              },
              {
                key: 'liquidity' as const,
                label: 'Liquidity alerts',
                desc: 'Thin or stretched on-chain pools',
              },
              {
                key: 'whaleflow' as const,
                label: 'Whale flow alerts',
                desc: 'Large-value transfers between chains',
              },
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{row.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.desc}</p>
                </div>
                <Toggle
                  checked={prefs.notifications[row.key]}
                  onChange={(v) =>
                    setPrefs((p) => ({
                      ...p,
                      notifications: { ...p.notifications, [row.key]: v },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </Section>

        <Section
          icon={Network}
          title="Network & indexer"
          body="Where BridgeGuard reads on-chain state from."
        >
          <div className="space-y-3">
            {backendOffline ? (
              <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-white/[0.07] dark:text-slate-400">
                No data available — the BridgeGuard backend is offline.
              </div>
            ) : (
              services.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{s.url}</p>
                  </div>
                  <Badge tone={s.healthy ? 'success' : 'critical'}>
                    {s.healthy ? 'online' : 'offline'}
                  </Badge>
                </div>
              ))
            )}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Contract</p>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{state.contractAddress}</p>
              </div>
              <Badge tone={allHealthy ? 'success' : 'neutral'}>
                {allHealthy ? 'deployed' : 'unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Appearance</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dark / light theme</p>
              </div>
              <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
            </div>
          </div>
        </Section>

        <Section
          icon={Database}
          title="Local data & privacy"
          body="BridgeGuard keeps private state encrypted on this device."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-white/[0.07]">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Private state</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">LevelDB · wallet-scoped · encrypted</p>
              </div>
              <Badge tone="violet">encrypted</Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Reset local state</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Clears the cache and re-syncs from the indexer.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-red-400/40 text-red-500 hover:bg-red-400/10 dark:text-red-400"
                onClick={refresh}
              >
                <RotateCcw className="size-4" />
                Reset & resync
              </Button>
            </div>
          </div>
        </Section>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-300">
        <ShieldCheck className="size-3.5 shrink-0" />
        Sensitive values like the confidential intel feed and wallet seed never leave this machine —
        only coarse verdicts are written to the Midnight ledger.
      </div>
    </div>
  );
}
