# MY SYSTEM V4

MY SYSTEM est une PWA mobile-first pensée comme un système personnel adaptatif : une prochaine action à la fois, progression, personnage, nutrition, journal vocal, bilans et Coach IA.

## Architecture

- GitHub Pages sert l'interface statique.
- `app.js` contient l'état local et les interactions.
- `api/coach.js` est le point d'entrée serveur prévu pour le vrai Coach.
- La clé OpenAI doit rester côté serveur dans `OPENAI_API_KEY`.
- Le modèle peut être défini avec `OPENAI_MODEL`.

## Important

GitHub Pages ne peut pas exécuter `api/coach.js`. Pour activer le vrai Coach, le dossier API devra être déployé sur un hébergeur serverless compatible (par exemple Vercel) puis l'URL de l'API devra être configurée dans l'application.

La version actuelle fonctionne sans serveur grâce au stockage local et à des réponses de secours.