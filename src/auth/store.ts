/**
 * Store d'authentification mobile (Zustand).
 *
 * Source de vérité pour : user courant, statut connecté, login/logout.
 * Tokens persistés dans SecureStore (cf. tokenStorage.ts).
 *
 * Flux :
 *   - `hydrate()` au démarrage → tente `/mobile/auth/me` avec l'access stocké
 *   - Si 401, le client API tente automatiquement un refresh
 *   - Sur perte de session (refresh KO), `setOnSessionLost` ramène `user=null`
 */
import { create } from 'zustand';

import { api, setDemoHeadersProvider, setOnSessionLost } from '../api/client';
import { clearTokens, getAccessToken, saveTokens } from './tokenStorage';
import type { LoginPayload, MobileUser, TokenPair } from '../types/api';

type DemoSpace = 'LOCATAIRE' | 'PROPRIETAIRE' | 'COLLABORATEUR';

interface AuthState {
  /** Indéterminé au démarrage tant que `hydrate()` n'a pas tourné. */
  hydrating: boolean;
  user: MobileUser | null;
  /**
   * Pour les ADMIN en mode démo : permet de basculer entre les 3 espaces sans
   * créer un compte par type. Ignoré pour les vrais utilisateurs LOCATAIRE,
   * PROPRIETAIRE et COLLABORATEUR qui ne voient que leur espace.
   */
  demoSpace: DemoSpace;
  /**
   * Pour les ADMIN : permet d'incarner un propriétaire précis (envoyé au backend
   * via le header X-Demo-Proprietaire-Id). null = fallback automatique.
   */
  demoProprietaireId: number | null;
  /** Erreur la plus récente du login, à afficher dans l'écran. */
  loginError: string | null;
  loginBusy: boolean;

  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<MobileUser | null>;
  logout: (refreshToken?: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  setDemoSpace: (s: DemoSpace) => void;
  setDemoProprietaireId: (id: number | null) => void;
}

export const useAuth = create<AuthState>((set, _get) => ({
  hydrating: true,
  user: null,
  demoSpace: 'LOCATAIRE',
  demoProprietaireId: null,
  loginError: null,
  loginBusy: false,

  setDemoSpace: (s) => set({ demoSpace: s }),
  setDemoProprietaireId: (id) => set({ demoProprietaireId: id }),

  hydrate: async () => {
    // Garde robuste : peu importe ce qui plante (SecureStore, réseau, JSON
    // invalide), `hydrating` DOIT toujours retomber à false sinon l'app reste
    // bloquée sur le splash.
    try {
      setOnSessionLost(() => set({ user: null }));
      // Brancher la lecture des headers démo sur le store courant (lazy).
      setDemoHeadersProvider(() => {
        const id = useAuth.getState().demoProprietaireId;
        const h: Record<string, string> = {};
        if (id != null) h['X-Demo-Proprietaire-Id'] = String(id);
        return h;
      });
      const access = await getAccessToken();
      if (!access) {
        set({ hydrating: false, user: null });
        return;
      }
      try {
        const me = await api.get<MobileUser>('/mobile/auth/me');
        set({ user: me, hydrating: false });
      } catch {
        set({ user: null, hydrating: false });
      }
    } catch (e) {
      console.warn('[auth] hydrate failed:', e);
      set({ user: null, hydrating: false });
    }
  },

  login: async (payload) => {
    set({ loginBusy: true, loginError: null });
    try {
      const tokens = await api.post<TokenPair>('/mobile/auth/login', payload, { skipAuth: true });
      await saveTokens(tokens.access_token, tokens.refresh_token);
      set({ user: tokens.user, loginBusy: false, loginError: null });
      return tokens.user;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connexion impossible';
      set({ loginBusy: false, loginError: msg, user: null });
      return null;
    }
  },

  logout: async (refreshToken) => {
    try {
      if (refreshToken) {
        await api.post('/mobile/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // logout local prioritaire — on continue même si le serveur n'a pas pu être notifié
    } finally {
      await clearTokens();
      set({ user: null });
    }
  },

  refreshMe: async () => {
    try {
      const me = await api.get<MobileUser>('/mobile/auth/me');
      set({ user: me });
    } catch {
      // ignore — l'auto-refresh + setOnSessionLost gère la perte
    }
  },
}));
