# SymSvel BO

Interface **Back Office** SvelteKit du framework SymSvel. Ce dépôt fournit les sources natives de l'interface ; une fois installées dans un projet, les modifications locales appartiennent au projet.

## Installation dans un projet SymSvel

Depuis un environnement disposant de la CLI SymSvel :

```bash
symsvel create-project --components=bo
```

Pour un projet de développement ou un crash-test, ajouter `--dev`. Le BO est toujours inclus lors de la création ; `--components=all` installe BO, App et Front. La CLI et le Tooling pilotent l'installation, la provenance et les mises à jour. Ne pas recréer manuellement ce dépôt avec `npx sv create` pour installer un composant SymSvel.

## Développement du dépôt

```bash
npm ci
npm run dev
npm run check
npm run lint
npm run build
npm run qa
```

Les scripts sont définis dans `package.json`. `npm run qa` exécute les contrôles statiques, le build, les tests unitaires et Playwright ; l'exécution locale de Playwright peut nécessiter ses navigateurs. Le build utilise l'adaptateur statique SvelteKit déclaré dans les dépendances.

## Mises à jour dans les projets

```bash
symsvel update bo
```

La mise à jour native est orchestrée par Tooling, avec suivi des fichiers gérés et contrôle des conflits. Elle ne doit ni écraser les modifications locales conflictuelles ni manipuler les branches Git du projet. Voir [le contrat technique](https://github.com/Symsvel-Framework/symsvel-tooling/blob/feat/60-update-init-simplification/docs/component-updates-v1.md).

Les parcours complets de création, Setup Wizard, synchronisation des modules et mises à jour doivent encore être éprouvés sur XT avant validation finale des PR CLI #10 et Tooling #62.

## Intégration continue

Le workflow `.github/workflows/ci.yml` s'exécute sur le runner Docker auto-hébergé de l'organisation, étiqueté `self-hosted`, `linux`, `ARM64` et `symsvel`. Il installe Node.js 24 via `actions/setup-node`, les dépendances npm via `npm ci` et le navigateur Chromium via `npx playwright install chromium`. Les bibliothèques système nécessaires à Chromium doivent déjà être présentes dans l'image du runner ; l'installation avec `--with-deps` n'est donc pas exécutée dans le job.

La CI conserve `npm run qa` (contrôles Svelte/TypeScript, lint, build statique, tests unitaires et Playwright) ainsi que la vérification des fichiers `build/index.html`, `build/.htaccess` et `build/robots.txt`. L'ancien workflow hébergé est archivé dans `.github/workflows/ci.yml.stub` pour référence et n'est pas exécuté.

Le runner doit rester disponible pour les événements `push` et `pull_request`. La validation de cette migration dépend du résultat effectif de la CI GitHub Actions.

## Fallback français des libellés d'interface (17/11/2026)

Les libellés intégrés de l'interface sont sélectionnés à partir de la langue d'interface (code ISO du navigateur ou du compte). Lorsque la locale n'a pas de dictionnaire intégré, les libellés français sont utilisés ; l'anglais reste disponible explicitement pour `en`. Le fallback ne modifie ni la langue ISO du site ni celle du compte et n'impose pas l'existence de traductions avant l'installation. Le repli doit être réalisé à la clé lors de l'introduction des dictionnaires dynamiques ; l'éditeur BO des traductions et le chargement fichier/BDD ne sont pas fournis par cette seule correction.

Vérifications : tests de sélection FR/EN/autres locales et tests de build/CI. La validation finale nécessite les crash-tests locaux sur le parcours Setup, BO et App.

## Traductions des composants natifs et des modules (18/11/2026)

Les dictionnaires système vivent sous `src/lib/translations/system/<lang>.ts`. Tooling copie ceux des modules sous `src/lib/translations/<module>/<lang>.ts`. Le helper i18n lit la convention `<scope>.<module|system>.<key>` et privilégie les personnalisations publiées (`src/lib/translations/generated`) puis les anciens fichiers `src/lib/i18n/generated` encore présents, avant les valeurs source. Les fichiers sont chargés à la compilation SvelteKit, sans API runtime et avec fallback par clé.
