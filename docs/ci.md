# Intégration continue

La branche `dev` est le terrain de développement ; `main` conserve la version stable.

Le workflow `.github/workflows/ci.yml` est déclenché par les `push` sur `dev` et `main`, ainsi que par les pull requests ciblant `main`. Les pull requests ciblant `dev` ne déclenchent pas de CI au titre de l'événement `pull_request` ; un `push` sur `dev` déclenche sa propre exécution. Les éventuels déclencheurs supplémentaires définis dans le workflow restent applicables.

Les jobs utilisent les runners auto-hébergés configurés dans le workflow. Une modification n'est validée qu'après exécution et réussite de la CI, puis les crash-tests locaux requis.

## Formatage automatique avant commit

Activer une fois par clone avec `sh scripts/install-hooks.sh`. Le hook Git versionné `.githooks/pre-commit` appelle `scripts/pre-commit-format.sh` : il exécute Prettier local sur les fichiers compatibles présents dans l'index Git et les réindexe. Les chemins contenant des espaces sont pris en charge. Cette approche ne reformate pas tout le dépôt et ne nécessite aucune dépendance supplémentaire au-delà de `npm install` / `npm ci`.

**Important :** les hooks Git sont locaux et ne s'exécutent pas lors des commits réalisés par l'API GitHub. Pour ces modifications distantes, appliquer explicitement Prettier avant de pousser. La CI conserve `prettier --check .` comme filet de sécurité. Le hook n'est pas installé automatiquement par `npm install` pour éviter de modifier la configuration Git du développeur sans son accord.

## Autoformatage sur runners (15/11/2026)

Le workflow CI exécute maintenant `npm run format` immédiatement après `npm ci`, avant les tests. Sur une branche de travail du dépôt (push sur `dev` ou PR interne vers `dev`/`main`), si Prettier a modifié des fichiers suivis, le workflow les commite et les pousse avec le compte GitHub Actions. Les tests QA s'exécutent ensuite sur le contenu formaté. Sur `main` et les PR issues d'un fork, le workflow ne pousse pas et échoue en cas de dérive de formatage.

Cette automatisation nécessite que les paramètres GitHub Actions du dépôt autorisent le jeton `GITHUB_TOKEN` à écrire dans le dépôt et que la branche accepte ces pushes. Un push effectué par ce jeton ne relance normalement pas un autre workflow GitHub Actions ; le job en cours exécute donc lui-même la QA après le formatage. Les contrôles et statuts GitHub peuvent rester attachés au commit déclencheur, et le crash-test local reste obligatoire. Le hook pre-commit reste utile pour les commits locaux mais n'est plus nécessaire pour corriger les commits envoyés par l'API.
