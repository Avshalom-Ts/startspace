import { AppShell } from './AppShell';
import { useTheme } from './hooks/useTheme';
import { NotificationProvider } from './notifications/notification-context';

export function App() {
  useTheme();
  return (
    <NotificationProvider>
      <AppShell />
    </NotificationProvider>
  );
}
