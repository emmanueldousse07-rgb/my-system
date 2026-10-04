# Installation rapide

## 1. Préparer le projet

Sur un Mac avec Xcode:

```bash
cd ios
brew install xcodegen
xcodegen generate
open MYSystem.xcodeproj
```

## 2. Signer l'app

Dans Xcode, sélectionne les targets **MYSystem** et **MYSystemWidget**, puis choisis ton équipe Apple dans **Signing & Capabilities**.

L'App Group doit être:

`group.com.mysystem.app`

Il doit être activé sur les deux targets.

## 3. Installer sur l'iPhone

Choisis ton iPhone comme destination, puis **Run**.

Une fois l'app installée:

1. Ouvre MY SYSTEM une première fois.
2. Laisse-la synchroniser ses quêtes.
3. Verrouille l'iPhone.
4. Personnalise l'écran verrouillé.
5. Ajoute le widget **MY SYSTEM — Prochaine quête**.
6. Le bouton **VALIDER** envoie la validation au stockage partagé.
7. Quand MY SYSTEM est relancé, la validation est appliquée au système web et les XP/statistiques sont recalculés.

## Limite importante

La version GitHub Pages reste une PWA. Le widget Lock Screen est fourni par l'app native iOS dans `ios/`; il ne peut pas être installé depuis une simple page web.
