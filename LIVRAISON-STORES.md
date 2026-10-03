# UPSide Mobile — Dossier de livraison App Store + Google Play

Pour le développeur chargé de **compiler et publier** l'application.
Le code est terminé, typé, connecté au backend de **production**.
**Aucun développement n'est à faire** : uniquement le packaging et la publication.

---

## 1. Identité de l'application

| | |
|---|---|
| Nom affiché | **UPSide** |
| Slug Expo | `upside-mobile` |
| Bundle ID iOS | `com.upside.mobile` |
| Package Android | `com.upside.mobile` |
| Version | **1.0.0** — build iOS `1`, versionCode Android `1` |
| Framework | Expo SDK 54 · React Native 0.81.5 · TypeScript |
| Backend (déjà en ligne) | `https://app.upside-gabon.com` |
| Orientation | Portrait uniquement |
| Node | **20.x** (`package-lock.json` fourni → `npm ci` reproductible) |

Trois espaces dans une seule app (Locataire / Propriétaire / Collaborateur) :
l'utilisateur se connecte, il est routé vers son espace selon son type de compte.

**Il n'y a pas d'inscription dans l'application** : les comptes sont créés par
l'agence depuis l'ERP. (Conséquence utile : Apple n'exige pas de fonction
« supprimer mon compte » dans l'app, cette règle ne visant que les apps
permettant de créer un compte.)

---

## 2. Ce qui est DÉJÀ fait (ne rien refaire)

- [x] Code fonctionnel, `npx tsc --noEmit` passe sans erreur
- [x] `app.json` pointe sur le backend de **production**
- [x] Version 1.0.0 / build 1 / versionCode 1 positionnés
- [x] Icônes aux bons formats : `icon.png` 1024×1024, icône adaptative Android
      (foreground 512×512 + background + monochrome)
- [x] Textes de permissions iOS rédigés en français (`infoPlist`)
- [x] Permissions caméra / photos déclarées via `expo-image-picker`
- [x] `eas.json` avec les profils `development`, `preview`, `production`
- [x] Politique de confidentialité en ligne : **https://upside-gabon.com/confidentialite**

---

## 3. Ce que le développeur doit fournir / obtenir

Ces éléments **ne peuvent pas être livrés dans ce paquet** : un binaire publiable
est signé avec les comptes du client, et c'est la signature qui le rend publiable.

| Élément | Pour quoi | Qui |
|---|---|---|
| Compte **Apple Developer Program** (99 $/an) | signer l'`.ipa` + App Store Connect | Client |
| Compte **Google Play Console** (25 $ une fois) | publier l'`.aab` | Client |
| Compte **Expo** (gratuit) | lancer les builds EAS | Dév. ou client |
| **Clé de signature Android** | signer l'`.aab` | Générée par EAS à la 1re build — **à conserver**, sa perte empêche toute mise à jour |
| Un **Mac + Xcode** | seulement si build iOS en local (inutile avec EAS) | Dév. |

---

## 4. Compiler

```bash
unzip UPSide-Mobile-v1.0.0.zip && cd mobile-v2
npm ci
npm install -g eas-cli
eas login                 # compte Expo
eas build:configure       # 1re fois : lie le projet, crée les identifiants
```

### iOS → `.ipa`
```bash
eas build --platform ios --profile production
```
EAS demande les identifiants **Apple Developer** à la première build, puis crée
seul le certificat de distribution et le provisioning profile. En fin de build,
un lien de téléchargement du `.ipa` signé est fourni.

### Android → `.aab`
```bash
eas build --platform android --profile production
```
Le profil `production` produit un **App Bundle** (`.aab`), format exigé par Google
Play. EAS génère et conserve la clé de signature à la première build.

### Les deux d'un coup
```bash
eas build --platform all --profile production
```

> **Alternative iOS sans EAS** : `npx expo prebuild --platform ios`, puis
> `cd ios && pod install`, ouvrir `ios/UPSide.xcworkspace` dans Xcode,
> choisir l'équipe de signature, **Product ▸ Archive ▸ Distribute App**.

---

## 5. Publier

### App Store (iOS)
1. Créer l'app dans **App Store Connect** avec le bundle `com.upside.mobile`.
2. Téléverser le `.ipa` (`eas submit --platform ios`, ou Transporter).
3. Renseigner la fiche (§6), joindre les captures d'écran.
4. Soumettre à la revue.

### Google Play (Android)
1. Créer l'app dans la **Play Console** avec le package `com.upside.mobile`.
2. Téléverser le `.aab` (`eas submit --platform android`, ou à la main).
3. Renseigner la fiche + le **questionnaire « Sécurité des données »** (§6).
4. Publier en test interne, puis en production.

Pour utiliser `eas submit`, compléter d'abord la section `submit` de `eas.json`
(`appleId`, `ascAppId`, `appleTeamId` pour iOS ; fichier de compte de service
Google pour Android). Sinon, téléverser manuellement, c'est équivalent.

---

## 6. Éléments de fiche (à recopier)

- **Nom** : UPSide
- **Sous-titre** : Gestion immobilière — Gabon
- **Catégorie** : Entreprise / Business
- **Politique de confidentialité** : https://upside-gabon.com/confidentialite
- **Site** : https://upside-gabon.com
- **Classification** : tout public (4+)
- **Compte de démonstration pour la revue** : indispensable — l'app n'a pas
  d'inscription, les relecteurs Apple et Google doivent recevoir un identifiant
  et un mot de passe de test fournis par l'agence.

**Données collectées** (pour les questionnaires Apple « App Privacy » et Google
« Sécurité des données ») : identifiants de connexion (e-mail), données de
gestion locative liées au compte, photos envoyées volontairement lors des
interventions et états des lieux. Transmission chiffrée (HTTPS). Aucune revente,
aucun traçage publicitaire, aucun partage avec des tiers.

**Captures d'écran** : à produire au simulateur/émulateur, formats exigés par
chaque store (iPhone 6,7" et 6,5" pour Apple ; téléphone pour Google).

---

## 7. Après la première publication

Pour chaque nouvelle version : incrémenter `version` dans `app.json`, et
`buildNumber` (iOS) / `versionCode` (Android) — ou laisser `autoIncrement` du
profil `production` s'en charger.
