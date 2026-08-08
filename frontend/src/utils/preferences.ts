// User preferences, persisted to localStorage and shared by the Settings page,
// Bridge Analysis and the AI Transfer Advisor. Nothing here is fabricated —
// these are real user-configurable defaults.

const STORAGE_KEY = 'bridgeguard-preferences';

export interface Preferences {
  defaultTolerance: number;
  defaultIntel: number;
  notifications: {
    security: boolean;
    liquidity: boolean;
    whaleflow: boolean;
  };
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultTolerance: 2,
  defaultIntel: 2,
  notifications: {
    security: true,
    liquidity: true,
    whaleflow: false,
  },
};

export function loadPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      defaultTolerance:
        typeof parsed.defaultTolerance === 'number'
          ? Math.max(0, Math.min(3, parsed.defaultTolerance))
          : DEFAULT_PREFERENCES.defaultTolerance,
      defaultIntel:
        typeof parsed.defaultIntel === 'number'
          ? Math.max(0, Math.min(20, parsed.defaultIntel))
          : DEFAULT_PREFERENCES.defaultIntel,
      notifications: {
        security: parsed.notifications?.security ?? DEFAULT_PREFERENCES.notifications.security,
        liquidity: parsed.notifications?.liquidity ?? DEFAULT_PREFERENCES.notifications.liquidity,
        whaleflow: parsed.notifications?.whaleflow ?? DEFAULT_PREFERENCES.notifications.whaleflow,
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
