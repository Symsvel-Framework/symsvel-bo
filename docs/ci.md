# Intégration continue

Depuis le 22/11/2026, la CI des dépôts publics SymSvel s'exécute sur **GitHub-hosted Ubuntu 24.04**, sans runner local. `.github/workflows/ci.yml` utilise Node.js 24, npm et Chromium/Playwright avec ses dépendances système ; déclencheurs : push sur `dev`, `main`, `feat/**` et PR vers `dev` ou `main`. `ci.yml.stub` est une archive inactive.

Les runners auto-hébergés du mainteneur restent réservés aux dépôts privés `symsvel-packages` et `symsvel-recipes`. Les validations CI ne remplacent pas les crash-tests locaux.

## Formatage automatique avant commit

Activer une fois par clone avec `sh scripts/install-hooks.sh`. Le hook Git versionné `.githooks/pre-commit` appelle `scripts/pre-commit-format.sh` : il exécute Prettier local sur les fichiers compatibles présents dans l'index Git et les réindexe. Les chemins contenant des espaces sont pris en charge. Cette approche ne reformate pas tout le dépôt et ne nécessite aucune dépendance supplémentaire au-delà de `npm install` / `npm ci`.

**Important :** les hooks Git sont locaux et ne s'exécutent pas lors des commits réalisés par l'API GitHub. Pour ces modifications distantes, appliquer explicitement Prettier avant de pousser. La CI conserve `prettier --check .` comme filet de sécurité. Le hook n'est pas installé automatiquement par `npm install` pour éviter de modifier la configuration Git du développeur sans son accord.

## Autoformatage sur runners (15/11/2026)

Le workflow CI exécute maintenant `npm run format` immédiatement après `npm ci`, avant les tests. Sur une branche de travail du dépôt (push sur `dev` ou PR interne vers `dev`/`main`), si Prettier a modifié des fichiers suivis, le workflow les commite et les pousse avec le compte GitHub Actions. Les tests QA s'exécutent ensuite sur le contenu formaté. Sur `main` et les PR issues d'un fork, le workflow ne pousse pas et échoue en cas de dérive de formatage.

Cette automatisation nécessite que les paramètres GitHub Actions du dépôt autorisent le jeton `GITHUB_TOKEN` à écrire dans le dépôt et que la branche accepte ces pushes. Un push effectué par ce jeton ne relance normalement pas un autre workflow GitHub Actions ; le job en cours exécute donc lui-même la QA après le formatage. Les contrôles et statuts GitHub peuvent rester attachés au commit déclencheur, et le crash-test local reste obligatoire. Le hook pre-commit reste utile pour les commits locaux mais n'est plus nécessaire pour corriger les commits envoyés par l'API.

## Poussées concurrentes et synchronisation (15/11/2026)

Plusieurs exécutions CI peuvent démarrer sur la même branche de PR après des commits rapprochés. Sans synchronisation, le second commit de formatage est refusé par Git en `non-fast-forward` (`fetch first`), même si le premier a déjà corrigé le fichier. Le job `test` est désormais sérialisé par branche avec `concurrency` (`cancel-in-progress: false`) et, avant tout push de formatage, récupère la tête distante puis rebase son commit sur celle-ci. Le push reste **sans force** ; un conflit de rebase fait échouer le job sans écraser de changement. La sérialisation évite les chevauchements entre jobs, pas les modifications externes : la vérification Git au moment du push reste nécessaire. L'autocorrection sur un commit GitHub Actions ne relance pas automatiquement la CI ; les tests s'exécutent dans le même job sur le contenu formaté.

## Releases sur GitHub-hosted (22/11/2026)

La publication de tags `vX.Y.Z` par `.github/workflows/release.yml` s'exécute sur GitHub-hosted Ubuntu 24.04. Elle conserve Node.js 24 et Playwright avec `--with-deps`, la vérification du tag, les contrôles existants et la création de GitHub Release via `actions/github-script@v7`. Aucun tag n'a été créé durant cette migration ; la validation d'une release réelle reste nécessaire.

## Navigation BO des modules (16/11/2026)

Les modules installés fournissent chacun leur entrée `bo/src/lib/modules/<slug>/navigation.ts` avec route, libellés FR/EN, ressource et action ACL et chemin GET protégé par le backend. Le dashboard Svelte découvre ces déclarations à la compilation avec `import.meta.glob` et ne montre un lien que si son appel de contrôle via `boApi` aboutit. Aucun module absent n'est affiché, et les accès refusés n'apparaissent pas dans les menus. Les autorisations restent vérifiées sur le backend, sans nouvel endpoint ni registre central Symfony. Tooling synchronise les fichiers, puis produit le build statique. Tests Vitest `navigation.test.ts` et CT XT des routes `/admins`, `/users`, `/settings` requis.

## Diagnostic de l'absence de menus BO sur XT (16/11/2026)

Le dashboard affiche désormais le nombre de modules déclarés dans le build SvelteKit. Si le compteur vaut zéro, l'assemblage du BO servi au navigateur ne contient pas les déclarations `src/lib/modules/*/navigation.ts` : vérifier la synchronisation Svelte puis reconstruire et republier `bo/build`. Si le compteur est supérieur à zéro mais qu'aucun lien n'apparaît, vérifier les appels GET protégés `/apibo/admins`, `/apibo/users`, `/apibo/settings` dans l'onglet Réseau et leurs codes HTTP. Les ACL continuent de s'appliquer en backend, jamais par simple affichage de liens.

Les chemins du dashboard sont compilés via `import.meta.glob` au build, et non chargés à l'exécution. Une simple installation Composer sans nouveau build BO peut donc laisser un ancien JavaScript dans le navigateur. Le nouveau transport de session est détaillé dans `docs/api-client.md`; même un reload du dashboard doit pouvoir retrouver son access token grâce au refresh cookie HttpOnly une fois la mise à jour Auth et Back déployée.

## CI des branches de chantier (19/11/2026)

Les pushes sur `feat/**` déclenchent désormais la CI locale du BO avant toute intégration sur `dev`. Cela permet de vérifier le design system sur `feat/bo-theme-design-system` sans ouvrir une seconde PR dans le dépôt. La CI reste sur runners auto-hébergés ; la CD conserve son déclenchement séparé. Éviter les pushes de correction redondants tant qu'un run est en cours.

## Première release fonctionnelle (20/11/2026)

Le libellé historique « Aucun changement fonctionnel » est remplacé par des notes générées à partir des changements réels. La QA doit précéder la GitHub Release, déclenchée exclusivement par un tag Git vérifié. Le CT final sans `--dev` est distinct des quatre CT de développement.


### Variables publiques du client Vite (22/11/2026)

Les clients SvelteKit lisent `import.meta.env.PUBLIC_API_URL`. Vite ne publie
pas `PUBLIC_*` via `import.meta.env` par défaut ; le projet utilise
`envPrefix: ['VITE_', 'PUBLIC_']` dans `vite.config.ts` pour respecter
le préfixe public du contrat SymSvel. Les URL sont des données publiques,
jamais des secrets. Les CD de projets doivent passer `PUBLIC_API_URL`
pendant le build, et non au runtime du serveur statique.
