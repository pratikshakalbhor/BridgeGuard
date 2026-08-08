export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs
    .flatMap((x) => (Array.isArray(x) ? x : [x]))
    .filter(Boolean)
    .join(' ');
}

export function shortAddress(addr: string, head = 6, tail = 6): string {
  if (!addr) return '';
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function fmtNumber(value: string | number | bigint): string {
  return BigInt(value).toLocaleString('en-US');
}

export function fmtCompact(value: string | number | bigint): string {
  const n = Number(BigInt(value));
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
}
