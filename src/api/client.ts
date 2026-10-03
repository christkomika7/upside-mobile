/**
 * Client API mobile — wrapper léger autour de `fetch` (Expo SDK 56 ships
 * `expo/fetch`, WinterTC-compliant). Pas d'axios pour MVP.
 *
 * Responsabilités :
 *   - Préfixer toutes les URLs avec `API_URL/api/v1`
 *   - Injecter le `Authorization: Bearer <access>` si présent
 *   - Sur 401, tenter UN refresh automatique puis rejouer la requête
 *   - Sur échec du refresh : clear tokens + signaler la perte de session
 *   - Normaliser les erreurs en `ApiError`
 *
 * Note : pas de cache ici — TanStack Query s'en charge côté hook.
 */
import Constants from 'expo-constants';

import { ApiError, type TokenPair } from '../types/api';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '../auth/tokenStorage';

// ── Config ──────────────────────────────────────────────────────────────────

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
export const API_URL = (extra.API_URL as string | undefined) ?? 'http://localhost:8003';
export const WS_URL = (extra.WS_URL as string | undefined) ?? 'ws://localhost:8003';
export const API_PREFIX = '/api/v1';

// ── Auth lifecycle hook ─────────────────────────────────────────────────────
// Permet au store auth d'observer la perte de session sans dépendance circulaire.

type SessionLostHandler = () => void;
let _onSessionLost: SessionLostHandler | null = null;
export function setOnSessionLost(handler: SessionLostHandler | null): void {
  _onSessionLost = handler;
}

// ── Demo headers (ADMIN seulement) ──────────────────────────────────────────
// Le store auth fournit une fonction qui retourne les headers démo courants
// (X-Demo-Proprietaire-Id, etc.). Le client les ajoute à chaque requête.

type HeaderProvider = () => Record<string, string>;
let _demoHeadersProvider: HeaderProvider | null = null;
export function setDemoHeadersProvider(provider: HeaderProvider | null): void {
  _demoHeadersProvider = provider;
}

// ── Refresh inflight dedupe ────────────────────────────────────────────────
// Empêche plusieurs requêtes 401 simultanées de déclencher N refresh en parallèle.

let _inflightRefresh: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (_inflightRefresh) return _inflightRefresh;
  _inflightRefresh = (async () => {
    const rt = await getRefreshToken();
    if (!rt) return null;
    try {
      const res = await fetch(`${API_URL}${API_PREFIX}/mobile/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as TokenPair;
      await saveTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      _inflightRefresh = null;
    }
  })();
  return _inflightRefresh;
}

// ── Core request ────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  /** Si true, n'injecte pas le Bearer (utilisé pour le login). */
  skipAuth?: boolean;
  /** Si true, n'essaie pas de refresh sur 401 (utilisé en interne par refresh). */
  skipAutoRefresh?: boolean;
  signal?: AbortSignal;
}

async function _doFetch(path: string, opts: RequestOptions, accessOverride?: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(_demoHeadersProvider ? _demoHeadersProvider() : {}),
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!opts.skipAuth) {
    const tok = accessOverride !== undefined ? accessOverride : await getAccessToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const url = path.startsWith('http') ? path : `${API_URL}${API_PREFIX}${path}`;
  return fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body:
      opts.body === undefined
        ? undefined
        : opts.body instanceof FormData
          ? opts.body
          : JSON.stringify(opts.body),
    signal: opts.signal,
  });
}

async function _parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  // Texte brut ou binaire (PDF) — renvoyer le Response brut en cast unsafe.
  return res as unknown as T;
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await _doFetch(path, opts);

  if (res.status === 401 && !opts.skipAuth && !opts.skipAutoRefresh) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      res = await _doFetch(path, opts, newAccess);
    } else {
      await clearTokens();
      if (_onSessionLost) _onSessionLost();
    }
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.detail === 'string') detail = data.detail;
    } catch {
      // pas de JSON, on garde le message HTTP
    }
    throw new ApiError(res.status, detail);
  }

  return _parseResponse<T>(res);
}

// ── Raccourcis ──────────────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T = unknown>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
