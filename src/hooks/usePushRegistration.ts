/**
 * Enregistrement du token Expo Push auprès du backend.
 *
 * Flux :
 *   1. Au mount (user connecté), on demande la permission notifications
 *   2. Si accordée, on récupère le ExpoPushToken
 *   3. On l'envoie à `/mobile/push/register`
 *
 * Sur Android, on s'assure aussi qu'un channel "default" existe pour que les
 * notifications passent (requis depuis Android 8).
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { api } from '../api/client';
import { useAuth } from '../auth/store';


/** Comportement des notifications quand l'app est au premier plan. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});


export function usePushRegistration() {
  const user = useAuth((s) => s.user);
  const done = useRef(false);

  useEffect(() => {
    if (!user || done.current) return;
    done.current = true;

    (async () => {
      try {
        if (!Device.isDevice) {
          // Les push ne marchent pas sur les simulateurs — skip silencieusement.
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Notifications UPSide',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00887F',
          });
        }

        // `granted` est disponible au runtime (PermissionResponse) mais le hoisting
        // npm de expo-modules-core fait que TS ne le voit pas — d'où le cast.
        const settings = (await Notifications.getPermissionsAsync()) as unknown as { granted: boolean };
        let granted = settings.granted;
        if (!granted) {
          const ask = (await Notifications.requestPermissionsAsync()) as unknown as { granted: boolean };
          granted = ask.granted;
        }
        if (!granted) return;

        const projectId =
          (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
          ?? Constants.easConfig?.projectId
          ?? undefined;

        const tokenResp = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const pushToken = tokenResp.data;
        if (!pushToken) return;

        await api.post('/mobile/push/register', {
          push_token: pushToken,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          device_name: Device.deviceName ?? null,
          os_version: typeof Device.osVersion === 'string' ? Device.osVersion : null,
        });
      } catch {
        // Ne pas casser l'app si la registration échoue — c'est best-effort.
      }
    })();

    return () => { done.current = false; };
  }, [user]);
}
