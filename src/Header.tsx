import { useState, useEffect } from 'react';
import { Link } from './components/Link';

export function Header({ nav }: { nav: { label: string; href: string }[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-page/80 backdrop-blur supports-backdrop-filter:bg-page/60">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-6 py-3">
        <div className="flex items-center gap-6">
          <Link label="StartSpace" href="#" />
          <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
            {nav.map((item) => (
              <Link key={item.label} label={item.label} href={item.href} />
            ))}
          </nav>
        </div>

        <ModeToggle />
      </div>
    </header>
  );
}

function ModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem('startspace.theme') as 'light' | 'dark') ?? 'light';
    setMode(stored);
    document.documentElement.setAttribute('data-theme', stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setMode(current);
  }, [mounted]);

  const toggle = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('startspace.theme', next);
  };

  return (
    // Button to toggle between light and dark mode
    <button
      className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-2.5 py-1.5 text-muted hover:text-fg hover:border-fg/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      onClick={toggle}
      aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${mode === 'light' ? 'dark' : 'light'} theme`}
    >
      {mounted ? (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {mode === 'light' ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </>
          ) : (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          )}
        </svg>
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
