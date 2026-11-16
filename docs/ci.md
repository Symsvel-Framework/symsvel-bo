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

## Poussées concurrentes et synchronisation (15/11/2026)

Plusieurs exécutions CI peuvent démarrer sur la même branche de PR après des commits rapprochés. Sans synchronisation, le second commit de formatage est refusé par Git en `non-fast-forward` (`fetch first`), même si le premier a déjà corrigé le fichier. Le job `test` est désormais sérialisé par branche avec `concurrency` (`cancel-in-progress: false`) et, avant tout push de formatage, récupère la tête distante puis rebase son commit sur celle-ci. Le push reste **sans force** ; un conflit de rebase fait échouer le job sans écraser de changement. La sérialisation évite les chevauchements entre jobs, pas les modifications externes : la vérification Git au moment du push reste nécessaire. L'autocorrection sur un commit GitHub Actions ne relance pas automatiquement la CI ; les tests s'exécutent dans le même job sur le contenu formaté.

## CD des releases sur runners locaux (16/11/2026)

La release déclenchée par un tag `vX.Y.Z` utilise maintenant `[self-hosted, linux, ARM64, symsvel]`. Le setup Node.js 24, les tests Playwright et la génération SvelteKit demeurent ; `npx playwright install chromium` réutilise le fonctionnement de la CI sans installer de paquets système. La publication GitHub conserve les notes statiques initiales et vérifie le tag via `actions/github-script@v7`, sans dépendre du binaire `gh` (non garanti sur le runner). L'autorisation `contents: write` est maintenue, aucun tag n'est créé ici. Validation par release réelle et CT de l'artefact requise.

## Navigation BO des modules (16/11/2026)

Les modules installés fournissent chacun leur entrée `bo/src/lib/modules/<slug>/navigation.ts` avec route, libellés FR/EN, ressource et action ACL et chemin GET protégé par le backend. Le dashboard Svelte découvre ces déclarations à la compilation avec `import.meta.glob` et ne montre un lien que si son appel de contrôle via `boApi` aboutit. Aucun module absent n'est affiché, et les accès refusés n'apparaissent pas dans les menus. Les autorisations restent vérifiées sur le backend, sans nouvel endpoint ni registre central Symfony. Tooling synchronise les fichiers, puis produit le build statique. Tests Vitest `navigation.test.ts` et CT XT des routes `/admins`, `/users`, `/settings` requis.
