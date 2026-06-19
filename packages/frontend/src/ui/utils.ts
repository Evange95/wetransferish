export function formatBytes(b: number): string {
  if (!b) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return (b / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + units[i];
}

export function fileExt(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.slice(0, 4).toUpperCase() : 'FILE';
}

export const mono = "'JetBrains Mono', monospace";
export const sans = "'Space Grotesk', sans-serif";
