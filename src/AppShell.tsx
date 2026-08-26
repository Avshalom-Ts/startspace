import { useState } from 'react';
import { Header } from './Header';
import { SearchBar, Favorites, PageFooter } from './components';
import { NAV } from './data/nav';
import { useTheme } from './hooks/useTheme';

export function AppShell() {
  const [searchQuery, setSearchQuery] = useState('');
  const { mounted } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header nav={NAV} />

      <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-2xl  mx-auto w-full">
        <div className="w-full">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <Favorites items={[]} />
      </main>

      <PageFooter />

      {!mounted && (
        <div className="fixed inset-0 flex items-center justify-center bg-page z-50 pointer-events-none">
          <div className="w-4 h-4 border-2 border-border border-t-fg rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
