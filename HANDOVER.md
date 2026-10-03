# UPSide Mobile — Checklist de livraison App Store & Play Store

Document destiné au développeur qui prend en charge la publication de l'app sur l'**App Store** (iOS) et **Google Play** (Android).

Le code est **fonctionnel et déployé en usage interne** : l'app est déjà connectée à un backend en prod (`https://app.upside-gabon.com`), les 3 espaces utilisateurs (Locataire / Propriétaire / Collaborateur) sont opérationnels, et un compte ADMIN permet de basculer entre chaque espace pour recette. Vous n'avez pas de développement fonctionnel à faire — juste le **packaging + publication**.

---

## 1. État du projet à la réception

### ✅ Ce qui est en place

- Config Expo complète : `app.json` avec **bundleIdentifier iOS** (`com.upside.mobile`) et **package Android** (`com.upside.mobile`)
- Icônes fournies :
  - `assets/icon.png` — icône iOS/générique (1024×1024)
  - `assets/android-icon-foreground.png` + `background.png` + `monochrome.png` — icônes adaptatives Android 8+
  - `assets/splash-icon.png` — splash screen
  - `assets/favicon.png` — favicon web
- Plugins Expo déclarés : `expo-secure-store`, `expo-notifications` (avec icône + couleur brand)
- URL de l'API prod : `https://app.upside-gabon.com` (dans `app.json` → `expo.extra.API_URL`)
- Node 20.x + `package-lock.json` fourni → `npm ci` reproductible
- TypeScript strict, aucune erreur de type au dernier check
- L'app tourne dans **Expo Go** immédiatement après `npm install && npx expo start`

### ⚠️ À nettoyer avant de zipper / commit initial sur votre remote

Trois fichiers/dossiers proviennent des outils internes utilisés pour le développement — **à supprimer avant handover** :

```bash
rm -rf .claude/               # Config outil de dev interne
rm CLAUDE.md AGENTS.md        # Notes internes (le README.md les remplace)
find . -name ".DS_Store" -not -path "./node_modules/*" -delete
```

Le repo est en état "explosif" côté git (voir §2 ci-dessous) — vous voudrez très probablement re-initialiser un git propre chez vous.

---

## 2. État du dépôt git

Le dossier `mobile/` a un **git local existant mais atypique** :

- Un seul commit (`Initial commit`)
- **Aucun remote configuré**
- Le dossier `src/` n'a jamais été ajouté à l'index (`?? src/` dans `git status`)
- Fichiers modifiés non commit : `App.tsx`, `app.json`, `package.json`

**Recommandation** : à la réception, initialisez proprement votre propre repo :

```bash
cd mobile
rm -rf .git .claude
rm CLAUDE.md AGENTS.md
find . -name ".DS_Store" -not -path "./node_modules/*" -delete

git init
git branch -M main
git add .
git commit -m "chore: initial import UPSide mobile"
git remote add origin <votre-remote>
git push -u origin main
```

---

## 3. Setup EAS (Expo Application Services)

L'app est en workflow **Expo managed** — pas de dossier `ios/` ni `android/` à maintenir, les builds passent par EAS.

Un `eas.json` est fourni à la racine avec 3 profils :

- **development** — dev client, avec debug menu
- **preview** — build interne (TestFlight interne / APK distribué)
- **production** — store submission

### Première initialisation

```bash
# Compte Expo requis (gratuit)
npx eas login

# Crée un projet Expo lié
npx eas init --id  # ou juste `npx eas init`
# → renseigne un projectId dans app.json → expo.extra.eas.projectId
```

### Builds

```bash
# iOS TestFlight
npx eas build --platform ios --profile production

# Android AAB (Play Store)
npx eas build --platform android --profile production
```

Le premier build iOS déclenchera un assistant pour créer un **certificat de distribution** et un **profil de provisionnement** — EAS peut les générer pour vous si vous fournissez vos credentials Apple Developer (Team ID + App-Specific Password).

### Soumission stores

```bash
npx eas submit --platform ios     --latest
npx eas submit --platform android --latest
```

Nécessite au préalable :
- **iOS** : compte **Apple Developer** actif (99 USD/an) + une App créée dans App Store Connect avec le bundleId `com.upside.mobile`
- **Android** : compte **Google Play Console** (25 USD one-time) + une App créée avec le package `com.upside.mobile` + un `google-service-account.json` fourni à EAS pour l'upload automatique

---

## 4. Checklist Apple App Store

- [ ] Compte Apple Developer actif (Team ID renseigné)
- [ ] App créée dans **App Store Connect** avec le bundleId **`com.upside.mobile`** (ou renseignez ici celui que vous choisirez)
- [ ] App Icon 1024×1024 : `assets/icon.png` **déjà fourni**
- [ ] Screenshots demandés (à produire) :
  - iPhone 6.7" (1290×2796) — obligatoire — au moins 3
  - iPhone 6.5" (1284×2778) — recommandé
  - iPad Pro 12.9" (2048×2732) — obligatoire si `supportsTablet: true` (c'est le cas dans `app.json`)
- [ ] Description en français + anglais
- [ ] Mots-clés
- [ ] URL support & politique de confidentialité (obligatoire depuis 2019)
- [ ] Classification du contenu (probablement 4+, aucune violence / achat in-app)
- [ ] Test build sur TestFlight avec au moins 3 comptes différents avant submit
- [ ] Compte de démo à fournir au reviewer Apple :
  - Email : `demo-reviewer@upside-gabon.com` (à créer avec Ralph)
  - Password : à définir
  - Instructions : « Se connecter avec les creds fournis. L'app propose 3 espaces (Locataire / Propriétaire / Collaborateur). »

### Permissions natives à documenter dans les métadonnées App Store

- **Caméra** : « Photographier les pièces lors d'un état des lieux »
- **Photothèque** : « Choisir des photos existantes pour illustrer un état des lieux »
- **Notifications** : « Recevoir des rappels de rendez-vous et alertes de factures »

Les libellés effectifs (NSCameraUsageDescription, NSPhotoLibraryUsageDescription, etc.) sont générés automatiquement par les plugins Expo. Si vous souhaitez les personnaliser, ajoutez-les dans `app.json` sous `expo.ios.infoPlist`.

---

## 5. Checklist Google Play Store

- [ ] Compte Google Play Console actif (25 USD payés une fois)
- [ ] App créée avec le package **`com.upside.mobile`**
- [ ] Signature de l'app confiée à Google Play (App Signing by Google Play, recommandé)
- [ ] Icône adaptative : **déjà fournie** (fg + bg + monochrome dans `/assets`)
- [ ] Screenshots demandés :
  - Téléphone (min. 2, max. 8) — au moins 3 recommandés
  - Tablette 7" et 10" si `supportsTablet` équivalent Android — ici non forcé
- [ ] Feature graphic 1024×500 (à produire — image de bandeau pour la fiche Play)
- [ ] Description courte (max 80 caractères)
- [ ] Description complète (max 4000 caractères)
- [ ] Politique de confidentialité (URL requise)
- [ ] Classification via questionnaire Google (probablement PEGI 3)
- [ ] Data safety : déclarer que l'app collecte **email + push token** transmis chiffrés vers `app.upside-gabon.com`
- [ ] Cible SDK Android 34+ (Play Store 2024) — géré automatiquement par Expo SDK 54 (compileSdk 35, targetSdk 34)

### Permissions natives déclarées automatiquement

- `INTERNET` — accès API
- `POST_NOTIFICATIONS` (Android 13+) — push
- `CAMERA` — photos EDL
- `READ_MEDIA_IMAGES` (Android 13+) / `READ_EXTERNAL_STORAGE` (Android ≤12) — galerie

---

## 6. Compte de test pour recette

Fournir aux stores un compte de démonstration. Ralph peut créer un utilisateur ADMIN dédié à ce rôle :

- Email : à demander à Ralph
- Password : à définir
- User type : **ADMIN**
- Avantage : ADMIN peut basculer entre les 3 espaces (Locataire / Propriétaire / Collaborateur) via **Profil → « Voir l'espace … »** — un seul compte couvre toute l'app.

---

## 7. Backend (contexte)

L'app est un pur client. Le backend (FastAPI + SQLite + WeasyPrint) tourne sur un VPS :

- API : `https://app.upside-gabon.com/api/v1`
- WebSocket : `wss://app.upside-gabon.com/api/v1/mobile/sync/ws`
- Doc Swagger : `https://app.upside-gabon.com/docs` (accès JWT requis)
- Endpoints mobiles préfixés : `/mobile/locataire/*`, `/mobile/proprietaire/*`, `/mobile/collaborateur/*`, `/mobile/auth/*`, `/mobile/media/*`, `/mobile/push/*`

Le backend est un dépôt séparé maintenu par Ralph. Aucune action de votre côté nécessaire, sauf coordination si un endpoint doit évoluer.

---

## 8. Points de vigilance techniques

### `react-native-web`, `react-dom`, `html2pdf.js` dans les deps

Ces trois packages ont été ajoutés pour permettre un aperçu **web** pendant le développement (`npx expo start --web`). Ils **n'entravent pas** les builds Android/iOS, mais ne sont pas nécessaires en prod mobile. Vous pouvez les laisser — le tree-shaking Metro les élimine des bundles natifs.

### expo-secure-store

Actif comme plugin dans `app.json`. Sur iOS, il utilise le **Keychain** (persistance même après désinstallation), pensez à mentionner ce comportement dans votre politique de confidentialité si besoin.

### Notifications push

Le token push est enregistré côté backend à chaque login (voir `src/hooks/usePushRegistration.ts`). Pour que les rappels fonctionnent en production :

- **iOS** : configurer une clé APNs dans EAS credentials
- **Android** : configurer un **google-services.json** (Firebase Cloud Messaging) — à obtenir depuis la Firebase Console, puis fournir à EAS via `eas credentials`

Sans ces credentials, les notifications ne partiront pas depuis la prod. L'app continuera de fonctionner normalement en revanche.

### iOS `supportsTablet: true`

Déclaré dans `app.json`. Cela oblige à fournir des screenshots iPad à la soumission. Si vous ne comptez pas maintenir iPad, passez à `false` (une seule ligne dans `app.json`).

### Assets manquants pour le splash

Le splash utilise `assets/splash-icon.png`. Aucun plugin `expo-splash-screen` configuré explicitement dans `app.json` — Expo utilisera les valeurs par défaut. Si vous souhaitez personnaliser (couleur de fond, positionnement), ajoutez le plugin :

```jsonc
"plugins": [
  ["expo-splash-screen", {
    "backgroundColor": "#2EC48A",
    "image": "./assets/splash-icon.png",
    "resizeMode": "contain"
  }]
]
```

---

## 9. Que faire si vous voulez « nettoyer » le code

Le code a été écrit fonctionnellement et est en usage réel — merci de **ne pas refactorer sans discussion**. En cas de doute :

- **Layout** de `DocumentDetailPage` (côté ERP web) et les 3 écrans FactureDetailScreen (mobile) sont figés par la direction — ne pas y toucher
- Le rendu PDF est **serveur** (WeasyPrint) — ne pas remettre en cause côté client
- La navigation en pile-par-tab est intentionnelle (garde le tab bar visible sur les détails) — ne pas revenir à un stack racine

Pour tout changement fonctionnel, coordination avec Ralph impérative.

---

## 10. Contact

- **Ralph Pinto** (owner, backend) : ralph.pinto1988@gmail.com

Bonne publication ! 🚀
