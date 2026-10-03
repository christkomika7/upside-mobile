/**
 * Singleton TanStack Query + wiring AppState/NetInfo spécifique RN.
 *
 * - `focusManager` est branché sur `AppState` (RN n'a pas de window focus).
 * - `onlineManager` est branché sur NetInfo pour stopper les refetch hors-ligne.
 */
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile : 30s de fraîcheur par défaut, suffisant pour limiter les refetch
      // sur changement de focus mais court assez pour rester synchro avec le web.
      staleTime: 30_000,
      // Refetch automatique au retour du focus app (équivalent web window-focus).
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

let _wired = false;

export function wireQueryToAppLifecycle(): void {
  if (_wired) return;
  _wired = true;

  // Branche NetInfo → onlineManager
  onlineManager.setEventListener((setOnline) => {
    const sub = NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    });
    return () => sub();
  });

  // Branche AppState → focusManager
  const onAppStateChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  };
  AppState.addEventListener('change', onAppStateChange);
}
