# SymSvel BO

> [!IMPORTANT]
> **Vous souhaitez utiliser SymSvel ? Rendez-vous sur [SymSvel CLI](https://github.com/Symsvel-Framework/symsvel-cli).** Ce dépôt est un **composant du framework**, pas un point d'installation autonome. Création de projets, installation des modules et mises à jour passent par la CLI. Les éventuelles commandes Composer, npm ou Symfony décrites ci-dessous concernent le travail des mainteneurs, sauf indication explicite contraire.

> [!WARNING]
> **SymSvel est en cours de développement.** Les fonctionnalités et procédures peuvent évoluer ou présenter des anomalies. **Utilisation à vos risques et périls.**

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

## Intégration continue GitHub-hosted (22/11/2026)

La CI de ce dépôt public utilise désormais **Ubuntu 24.04 sur les runners GitHub**, sans dépendance au Docker du mainteneur. Le workflow actif est `.github/workflows/ci.yml` ; il installe Node.js 24, lance `npm ci`, installe Chromium avec `npx playwright install --with-deps chromium` et conserve les contrôles Svelte/TypeScript, lint, build, tests unitaires et Playwright. Le formatage automatique des branches de travail reste inchangé. L'ancienne version `ci.yml.stub` est inactive.

La publication par tag (`.github/workflows/release.yml`) utilise elle aussi GitHub-hosted. Les runners auto-hébergés sont réservés à `symsvel-packages` et `symsvel-recipes`, qui restent privés. Une CI verte ne remplace pas les crash-tests locaux.


## Fallback français des libellés d'interface (17/11/2026)

Les libellés intégrés de l'interface sont sélectionnés à partir de la langue d'interface (code ISO du navigateur ou du compte). Lorsque la locale n'a pas de dictionnaire intégré, les libellés français sont utilisés ; l'anglais reste disponible explicitement pour `en`. Le fallback ne modifie ni la langue ISO du site ni celle du compte et n'impose pas l'existence de traductions avant l'installation. Le repli doit être réalisé à la clé lors de l'introduction des dictionnaires dynamiques ; l'éditeur BO des traductions et le chargement fichier/BDD ne sont pas fournis par cette seule correction.

Vérifications : tests de sélection FR/EN/autres locales et tests de build/CI. La validation finale nécessite les crash-tests locaux sur le parcours Setup, BO et App.

## Traductions des composants natifs et des modules (18/11/2026)

Les dictionnaires système vivent sous `src/lib/translations/system/<lang>.ts`. Tooling copie ceux des modules sous `src/lib/translations/<module>/<lang>.ts`. Le helper i18n lit la convention `<scope>.<module|system>.<key>` et privilégie les personnalisations publiées (`src/lib/translations/generated`) puis les anciens fichiers `src/lib/i18n/generated` encore présents, avant les valeurs source. Les fichiers sont chargés à la compilation SvelteKit, sans API runtime et avec fallback par clé.

Les libellés de pagination à paramètres (`bo.system.count` et `bo.system.page`) utilisent des modèles textuels avec placeholders limités (`{first}`, `{last}`, `{total}`, `{current}`). Les fonctions d'affichage les substituent sans évaluer de code, et conservent les formats FR/EN historiques.

Compatibilité : lors de la migration de `components.*` vers `bo.system.*`, la lecture des anciens fichiers `lib/i18n/generated` peut encore consulter `components.<clé>`. Languages copie les personnalisations BDD historiques vers `system.<clé>` sans détruire les anciennes lignes.

### Propriété des clés natives BO (18/11/2026)

Le tableau de bord de l'hôte BO est un composant natif : ses libellés sont déclarés sous `bo.system.dashboard.*` dans `src/lib/translations/system/{fr,en}.ts`. À l'inverse, la route native `/login` relève fonctionnellement du module Auth : elle consomme `bo.auth.signIn.*` fourni par `symsvel-module-auth`, avec les libellés français historiques comme fallback avant synchronisation. Les routes ne sont pas déplacées et les composants restent légers.

### Stabilité des dictionnaires TypeScript

Le dossier `src/lib/translations/**` est exclu de Prettier : ses fichiers `.ts` sont des exports JSON strictement compatibles (`export default {"key":"value"} as const;`) que Tooling lit comme données, sans exécuter TypeScript. L'exclusion préserve l'intégrité des fichiers issus des modules et des dictionnaires publiés par Languages. Les autres sources BO continuent d'être formatées normalement.

### Contrôle de CI sur branche de travail

La CI a été exécutée sur la branche de traduction avec les runners locaux ; le déclencheur temporaire de cette branche a ensuite été retiré, et les règles de publication/restauration du workflow (`dev`, `main` et PR selon le dépôt) ont été conservées. Les CT XT restent requis avant merge.

### Shell BO : propriété des traductions (18/11/2026)

La navigation native, les alertes et le menu du shell appartiennent à `bo.system.shell.*`. Les états de connexion et la déconnexion sont rattachés à Auth (`bo.auth.session.*`). Le libellé de compte administrateur est rattaché à Admins (`bo.admins.account.administrator`). Le composant conserve ses fallbacks historiques et n'effectue aucun appel de traduction runtime.

### Validation finale de la passe dictionnaires (18/11/2026)

La CI complète de la branche de traduction, incluant les tests de synchronisation et la documentation Maker pour Tooling, ou les composants natifs du shell pour BO, a réussi sur les runners locaux. Le déclencheur CI temporaire de la branche a été retiré. La validation ne remplace pas les crash-tests XT ni les essais de migration multibase avant merge.

## Guide développeur BO

Le référentiel du **Design System** et des composants que les modules peuvent
importer se trouve dans [`docs/dev/bo-components.md`](docs/dev/bo-components.md).
Il documente les composants réellement livrés, leurs props, les exemples
Svelte, les variantes sémantiques des boutons, les jetons de couleur et
les règles clair/sombre. Il ne remplace pas la documentation propre à
chaque module.

---

## Licence MIT et contributions

Ce dépôt est distribué sous [licence MIT](LICENSE). Le code peut être utilisé, modifié et redistribué, y compris dans des projets commerciaux ou propriétaires, dans les conditions de cette licence (notamment la conservation de la notice de copyright et de licence).

**Contribuer :** créer un fork, puis proposer une pull request vers `dev` lorsque cette branche existe, sinon vers la branche par défaut. Expliquer la modification et fournir les tests et la documentation concernés. Les mainteneurs conservent la maîtrise des revues, des validations (CI et crash-tests), de l'intégration et des releases officielles. Une PR ne garantit pas son acceptation.

**Versions officielles :** seules les versions diffusées par l'organisation [Symsvel-Framework](https://github.com/Symsvel-Framework) sont officielles. Les forks sont libres sous MIT, mais ne doivent pas être présentés comme officiellement approuvés par les mainteneurs. Cette distinction n'ajoute aucune restriction aux droits accordés par la licence MIT sur le code.

## Participer et soutenir le projet

SymSvel est un projet en cours de développement. Pour contribuer, proposer une amélioration ou échanger avec le mainteneur : **[xavier@xavier-tezza.fr](mailto:xavier@xavier-tezza.fr)**.

SymSvel vous est utile et vous souhaitez me remercier ? **Offrez-moi une bière ! 🍺** (lien PayPal à compléter avant l'ouverture publique).
