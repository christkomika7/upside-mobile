/**
 * Stockage sécurisé des tokens mobiles (Keychain iOS / Keystore Android).
 *
 * - Access token : court (15 min) — pas strictement nécessaire de le persister,
 *   mais on le garde pour éviter un round-trip refresh au démarrage si valide.
 * - Refresh token : long (7 jours) — DOIT être stocké de façon sûre car son vol
 *   permet de générer des access tokens jusqu'à expiration ou révocation.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'upside.access_token';
const KEY_REFRESH = 'upside.refresh_token';

const OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

// SecureStore n'existe pas en web (aperçu Expo web). On dégrade vers localStorage
// uniquement dans ce cas — sur natif on garde Keychain/Keystore inchangé.
const isWeb = Platform.OS === 'web';
const webStore = {
  get: (k: string): string | null => {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem(k) : null; } catch { return null; }
  },
  set: (k: string, v: string): void => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(k, v); } catch {}
  },
  del: (k: string): void => {
    try { if (typeof window !== 'undefined') window.localStorage.removeItem(k); } catch {}
  },
};

// Tous les appels SecureStore sont enveloppés défensivement : sur Expo Go ou
// dans certaines configs (web, simulateur sans Keychain), une exception
// SecureStore bloquerait l'app entière sur le splash si elle remontait jusqu'au
// store auth. On dégrade silencieusement vers "pas de token" plutôt que crasher.

export async function saveTokens(access: string, refresh: string): Promise<void> {
  if (isWeb) {
    webStore.set(KEY_ACCESS, access);
    webStore.set(KEY_REFRESH, refresh);
    return;
  }
  try {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, access, OPTS),
      SecureStore.setItemAsync(KEY_REFRESH, refresh, OPTS),
    ]);
  } catch (e) {
    console.warn('[tokenStorage] saveTokens failed:', e);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (isWeb) return webStore.get(KEY_ACCESS);
  try {
    return await SecureStore.getItemAsync(KEY_ACCESS);
  } catch (e) {
    console.warn('[tokenStorage] getAccessToken failed:', e);
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  if (isWeb) return webStore.get(KEY_REFRESH);
  try {
    return await SecureStore.getItemAsync(KEY_REFRESH);
  } catch (e) {
    console.warn('[tokenStorage] getRefreshToken failed:', e);
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  if (isWeb) {
    webStore.del(KEY_ACCESS);
    webStore.del(KEY_REFRESH);
    return;
  }
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
    ]);
  } catch (e) {
    console.warn('[tokenStorage] clearTokens failed:', e);
  }
}
