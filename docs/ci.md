# Intégration continue

La branche `dev` est le terrain de développement ; `main` conserve la version stable.

Le workflow `.github/workflows/ci.yml` est déclenché par les `push` sur `dev` et `main`, ainsi que par les pull requests ciblant `main`. Les pull requests ciblant `dev` ne déclenchent pas de CI au titre de l'événement `pull_request` ; un `push` sur `dev` déclenche sa propre exécution. Les éventuels déclencheurs supplémentaires définis dans le workflow restent applicables.

Les jobs utilisent les runners auto-hébergés configurés dans le workflow. Une modification n'est validée qu'après exécution et réussite de la CI, puis les crash-tests locaux requis.

## Formatage automatique avant commit

Activer une fois par clone avec `sh scripts/install-hooks.sh`. Le hook Git versionné `.githooks/pre-commit` appelle `scripts/pre-commit-format.sh` : il exécute Prettier local sur les fichiers compatibles présents dans l'index Git et les réindexe. Les chemins contenant des espaces sont pris en charge. Cette approche ne reformate pas tout le dépôt et ne nécessite aucune dépendance supplémentaire au-delà de `npm install` / `npm ci`.

**Important :** les hooks Git sont locaux et ne s'exécutent pas lors des commits réalisés par l'API GitHub. Pour ces modifications distantes, appliquer explicitement Prettier avant de pousser. La CI conserve `prettier --check .` comme filet de sécurité. Le hook n'est pas installé automatiquement par `npm install` pour éviter de modifier la configuration Git du développeur sans son accord.
