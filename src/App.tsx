import { AppShell } from './AppShell';
import { useTheme } from './hooks/useTheme';

export function App() {
  useTheme();
  return <AppShell />;
}
