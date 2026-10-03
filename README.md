# UPSide Mobile

Application mobile React Native / Expo pour la plateforme UPSide Gabon (gestion immobilière). Trois espaces utilisateurs : **Locataire**, **Propriétaire**, **Collaborateur**. Une bascule ADMIN interne permet de tester chaque espace depuis un même compte.

L'app est un **client de l'API HTTPS** hébergée sur `https://app.upside-gabon.com` (backend FastAPI/WeasyPrint). Elle n'embarque aucune logique métier propre — toute la source de vérité est côté serveur.

---

## Stack

| Domaine | Choix |
|---|---|
| Runtime | **Expo SDK 54** (managed workflow) |
| Langage | TypeScript 5.9 (strict) |
| UI | React Native 0.81 + React 19 |
| Navigation | `@react-navigation/native` v7 (native-stack + bottom-tabs) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 (auth) |
| Auth storage | `expo-secure-store` (Keychain iOS / Keystore Android) |
| Réseau | `fetch` natif + intercepteur JWT (rafraîchit auto) |
| Icônes | `lucide-react-native` |
| PDF | rendu côté **serveur** (WeasyPrint) — récupéré en blob puis `expo-print` (impression) / `expo-sharing` (partage) |
| Push | `expo-notifications` (token FCM/APNs enregistré côté backend) |
| Signatures | tracé libre (SVG), sérialisé en JSON |

---

## Pré-requis

- **Node.js 20.x** (LTS)
- **npm 10.x** (le lockfile est `package-lock.json`)
- **Expo CLI** : `npx expo` (pas d'installation globale nécessaire)
- Pour un build natif : compte **EAS** ([expo.dev](https://expo.dev)) + **Xcode 15+** (iOS) / **Android Studio Iguana+** (Android)

---

## Démarrage

```bash
# Cloner le projet
cd mobile
npm install

# Lancer en mode dev sur Expo Go
npx expo start

# Simulateur iOS (nécessite Xcode)
npx expo start --ios

# Émulateur Android (nécessite Android Studio)
npx expo start --android
```

L'app cible **par défaut la prod** (`https://app.upside-gabon.com`, cf. `app.json` → `expo.extra.API_URL`). Voir `src/api/client.ts` pour l'usage.

---

## Structure du code

```
mobile/
├── App.tsx                    Entrée : providers (SafeArea, RQ, Nav) + splash
├── index.ts                   registerRootComponent
├── app.json                   Config Expo (bundle IDs, icônes, permissions, API_URL)
├── package.json               Deps + scripts
├── metro.config.js            Config Metro par défaut Expo
├── tsconfig.json              Extends expo/tsconfig.base + strict
├── assets/                    Icônes, splash, favicon
└── src/
    ├── api/
    │   └── client.ts          Wrapper fetch + intercepteur refresh JWT
    ├── auth/
    │   ├── store.ts           Zustand : hydrate / login / logout / user
    │   └── tokenStorage.ts    SecureStore (natif) + localStorage (web fallback)
    ├── components/            UI réutilisable (Button, Card, TextField, DateField,
    │                          PdfViewerModal, StatusPill, SignaturePad, …)
    ├── constants/             Constantes (couleurs, tokens légaux si nécessaires)
    ├── hooks/
    │   ├── queryClient.ts     Instance TanStack Query + wiring AppState/NetInfo
    │   ├── collaborateur.ts   Hooks TQ pour /mobile/collaborateur/*
    │   ├── locataire.ts       Hooks TQ pour /mobile/locataire/*
    │   ├── proprietaire.ts    Hooks TQ pour /mobile/proprietaire/*
    │   ├── useRealtimeSync.ts WebSocket pour invalidation temps réel
    │   ├── usePushRegistration.ts Enregistre le token push chez le backend
    │   └── useAvatarUpload.ts
    ├── navigation/
    │   ├── RootNavigator.tsx  Auth vs espace (Locataire/Propriétaire/Collab)
    │   ├── AuthStack.tsx
    │   ├── LocataireStack.tsx / LocataireTabs.tsx
    │   ├── ProprietaireStack.tsx / ProprietaireTabs.tsx
    │   ├── CollaborateurStack.tsx / CollaborateurTabs.tsx
    │   └── types.ts           Typages des routes et params
    ├── screens/
    │   ├── auth/              LoginScreen
    │   ├── locataire/         Accueil, Bail, Factures, EDL, Interventions, Profil
    │   ├── proprietaire/      Décompte, Mes biens, Factures, Interventions,
    │   │                      Transactions, Profil
    │   └── collaborateur/     RDV, Catalogue, EDL, Interventions, Profil
    ├── theme/
    │   ├── colors.ts / spacing.ts / inputs.ts
    │   └── index.ts           Re-export unique
    ├── types/
    │   └── api.ts             DTO renvoyés par le backend
    └── utils/
        ├── format.ts          fmtMontant, fmtDate, frToIso, maskDateFr, …
        ├── backendPdf.ts      viewBackendPdf / printBackendPdf / downloadBackendPdf
        └── webPdf.ts          Helpers PDF sur React Native Web
```

**Convention de navigation** : chaque onglet du bottom-tab est enveloppé dans sa propre pile Stack — ainsi la barre d'onglets reste visible sur les écrans de détail. La pile racine ne fait que sélectionner l'espace utilisateur selon `user.user_type` (LOCATAIRE | PROPRIETAIRE | COLLABORATEUR | ADMIN).

**Endpoints backend** : tout est sous `/api/v1/mobile/<espace>/*` sur `https://app.upside-gabon.com`. Le backend est un dépôt séparé (contactez Ralph pour l'accès).

---

## Configuration prod / staging

L'URL de l'API est lue dans `app.json` → `expo.extra.API_URL` (et `WS_URL`). Pour changer d'environnement :

```jsonc
// app.json
"extra": {
  "API_URL": "https://app.upside-gabon.com",
  "WS_URL":  "wss://app.upside-gabon.com"
}
```

Consommé dans `src/api/client.ts` :

```ts
const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as Record<string, unknown>;
export const API_URL = (extra.API_URL as string | undefined) ?? 'http://localhost:8003';
```

Aucune variable d'env `.env` n'est nécessaire.

---

## Permissions natives

Déclarées via Expo config plugin (voir `app.json`) :

| Permission | Usage | Plugin |
|---|---|---|
| Notifications push | Rappels RDV, interventions, factures | `expo-notifications` |
| Keychain / Keystore | Stockage tokens JWT | `expo-secure-store` |
| Caméra | Photos EDL, avatars | `expo-image-picker` (demandée à l'usage) |
| Photothèque | Choix photos EDL, avatars | `expo-image-picker` (demandée à l'usage) |
| Impression | Factures, EDL, décomptes | `expo-print` (aucun prompt) |
| Partage | Télécharger PDF | `expo-sharing` (aucun prompt) |

Les prompts iOS/Android sont demandés à l'usage la première fois. Les messages d'explication sont générés par défaut par les plugins Expo — si vous souhaitez les personnaliser, éditez `app.json`.

---

## Build production (EAS)

Un `eas.json` est fourni avec 3 profils : `development`, `preview`, `production`.

```bash
# Se connecter à Expo (compte Expo requis)
npx eas login

# Lier le projet à un compte / créer un projet Expo
npx eas init

# Build binaires
npx eas build --platform ios --profile production
npx eas build --platform android --profile production

# Soumission Apple / Google (après build)
npx eas submit --platform ios --latest
npx eas submit --platform android --latest
```

Voir **HANDOVER.md** pour la checklist complète de mise en ligne App Store / Play Store.

---

## Scripts npm

| Commande | Effet |
|---|---|
| `npm start` | Expo dev server (choix ios/android/web via le CLI) |
| `npm run ios` | Lance sur simulateur iOS |
| `npm run android` | Lance sur émulateur Android |
| `npm run web` | Sert la version web (dev only, pas destiné à la prod) |

---

## Support & contacts

- **Backend / API** : Ralph Pinto (ralph.pinto1988@gmail.com)
- **Documentation API** : `https://app.upside-gabon.com/docs` (Swagger, accès JWT requis)

---

## Licence

Voir [LICENSE](./LICENSE).
