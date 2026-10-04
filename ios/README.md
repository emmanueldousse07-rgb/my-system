# MY SYSTEM — iOS + Lock Screen Widget

Cette partie ajoute une vraie app iOS native autour de la PWA MY SYSTEM et un widget WidgetKit.

## Ce qui est prévu

- App iOS qui ouvre l'interface MY SYSTEM actuelle.
- App Group partagé: `group.com.mysystem.app`.
- Widget écran verrouillé rectangulaire.
- Prochaine quête + heure + XP.
- Bouton **VALIDER** directement depuis le widget.
- La validation est stockée immédiatement par le widget.
- Au prochain lancement/retour de l'app, la validation est transmise au système web et `completeTask()` applique XP/statistiques.
- Le widget est rafraîchi après validation.

## Génération du projet

Le fichier `project.yml` est prévu pour XcodeGen.

1. Installer Xcode 15+ / iOS 17+.
2. Installer XcodeGen si nécessaire.
3. Dans le dossier `ios`, lancer:
   `xcodegen generate`
4. Ouvrir `MYSystem.xcodeproj`.
5. Vérifier que l'App Group `group.com.mysystem.app` est activé pour les deux targets.
6. Choisir ton iPhone comme destination et lancer.

### Important

GitHub Pages/Vercel ne peuvent pas installer une extension WidgetKit. Le dépôt contient maintenant le code natif nécessaire, mais la compilation/signature iOS doit être faite avec Xcode et ton compte Apple.

Le widget utilise App Intents et nécessite iOS 17+.
