import { useState, useEffect } from 'react';
import { Link } from './components/Link';
import { Logo } from './components/Logo';
import { GITHUB_URL } from './data/nav';

export function Header({ nav }: { nav: { label: string; href: string }[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-page/80 backdrop-blur supports-backdrop-filter:bg-page/60">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center max-w-3xl mx-auto px-6 py-3">
        <div className="flex items-center">
          <Logo />
        </div>

        <nav className="hidden sm:flex items-center justify-center gap-4 text-sm font-medium">
          {nav.map((item) => (
            <Link key={item.label} label={item.label} href={item.href} />
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <ModeToggle />
          <GitHubLink />
        </div>
      </div>
    </header>
  );
}

function GitHubLink() {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-2.5 py-1.5 text-muted hover:text-fg hover:border-fg/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      aria-label="View source on GitHub"
      title="View source on GitHub"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.76 1.19 1.76 1.19 1.03 1.75 2.7 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    </a>
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
