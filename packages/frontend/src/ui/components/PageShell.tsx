interface PageShellProps {
  maxWidth?: number;
  children: React.ReactNode;
}

export function PageShell({ maxWidth = 640, children }: PageShellProps) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(1100px 640px at 50% -10%, rgba(23,21,15,.05), transparent 62%), radial-gradient(760px 560px at 90% 110%, rgba(23,21,15,.03), transparent 55%)', animation: 'wt-drift 20s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .6, backgroundImage: 'radial-gradient(rgba(23,21,15,.05) 1px, transparent 1px)', backgroundSize: '24px 24px', maskImage: 'radial-gradient(circle at 50% 35%, #000, transparent 72%)', WebkitMaskImage: 'radial-gradient(circle at 50% 35%, #000, transparent 72%)' }} />
      <main style={{ position: 'relative', width: '100%', maxWidth, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {children}
        <footer style={{ marginTop: 18, textAlign: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#b3aea3' }}>Wetransferish</span>
        </footer>
      </main>
    </div>
  );
}
