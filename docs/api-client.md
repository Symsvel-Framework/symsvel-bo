# BO API client and language contract

The BO uses `src/lib/api/client.ts` for HTTP requests and `src/lib/api/locales.ts` for language selection. Functional modules should use this client rather than implementing independent fetch wrappers.

## Routing

- `/apibo`: back-office APIs.
- `/api`: application APIs.
- `/apiopen`: public APIs and unauthenticated reference data, where provided by the backend.

A route prefix does **not** determine authentication by itself. Public login and registration operations can exist in their respective API areas. Actual endpoints must be declared by the owning module; the client does not manufacture them.

## Languages

Every normal request appends `ui_lang` (interface language) and `translation_lang` (content language). The interface language uses the administrator preference when populated, otherwise the browser language, falling back to `en`. The content language is independent and defaults to the interface language. Existing URL parameters take precedence. Per-request overrides `uiLang` and `translationLang` are available; `skipLocales` disables both additions.

The Auth module will supply the administrator preference after profile loading. Translation dictionaries, fallback rules and cache invalidation remain backend responsibilities.

## Public requests and authentication integration

Pass `public: true` for endpoints that must never send a token or cookies, such as login or unauthenticated reference data. The client removes any Authorization header and sets `credentials: 'omit'`. Non-public requests can temporarily receive `accessToken` explicitly; the BO session lifecycle is implemented separately in `session.ts` (temporary in-memory tokens, refresh on `currentBo()`, and logout). Do not duplicate its session lifecycle in functional modules.

The client uses `PUBLIC_API_URL` when set; otherwise, in a browser, it resolves `bo.example` to `backend.example`. Outside the browser an explicit URL is required. The client accepts root-relative paths only.

Responses follow the SymSvel envelope (`{data: ...}`, `{error: {code, message}}`, or HTTP 204). Errors throw `ApiError` with HTTP status and optional API code.

## Validation

Run `npm run check`, `npm run lint`, `npm run build` and `npm run test:unit -- --run`. Full QA and real browser/backend crash tests are required before completion. Verify backend route contracts, CORS and Auth integration separately.

## Première passe visuelle BO (14/11/2026)

Les vues `/login` et `/dashboard` reprennent les styles et la structure de XCore (`src/app.css`, coque d'authentification et coque BO). L'accueil redirige vers `/login`. Le formulaire envoie une requête publique `POST /apibo/auth/login` et utilise désormais `loginBo()` pour vérifier l'identité BO. Le transport durable sécurisé reste à raccorder ; la session éphémère permet l'accès au dashboard tant que la page n'est pas rechargée.

Raccordements encore requis : transport HttpOnly/CSRF/CORS et tests réels navigateur/backend. La vérification d'accès, le renouvellement à la demande et la déconnexion sont désormais câblés en mode éphémère. Aucun écran 2FA, récupération de mot de passe ou création de compte App n'est inclus dans cette passe.

Le formulaire utilise provisoirement l'import relatif `../../lib/api/client`, résolu sans alias par TypeScript. La configuration actuelle de `tsconfig.json` étend `$app/tsconfig` et ne prouve pas la résolution de l'alias `#lib` dans `svelte-check` ; la CI valide ce point.

Les redirections internes SvelteKit passent par `resolve('/login')` avant `goto(...)`, conformément à la règle ESLint `svelte/no-navigation-without-resolve` du projet.

## Session BO éphémère (14/11/2026)

Le formulaire `/login` utilise maintenant `loginBo` (`src/lib/api/session.ts`) : `POST /apibo/auth/login`, puis vérification de l'identité par `GET /apibo/auth/me`. Le dashboard n'est rendu qu'après une nouvelle vérification `/me` ; en cas d'échec, retour à `/login`. La déconnexion appelle `POST /apibo/auth/logout` et efface immédiatement les secrets en mémoire, même si la requête réseau échoue.

**Limitation volontaire de sécurité :** les tokens restent uniquement en mémoire JavaScript, jamais en localStorage, sessionStorage ni cookie lisible par JS. Un rechargement complet perd donc la session et oblige à se reconnecter. Ce mécanisme transitoire ne remplace pas un transport serveur par cookies HttpOnly/Secure avec politique CSRF et CORS validée. Les tokens exposés au JavaScript restent vulnérables en cas de XSS. Pas de protection globale de toutes les routes ni de validation navigateur/backend : ne pas considérer cette passe comme prête pour la production.

## Prévention des courses de session

Chaque tentative de connexion et déconnexion incrémente une génération de session. Une réponse tardive de login ou de vérification `/me` ne peut plus rétablir un état après déconnexion ou remplacer une session plus récente. `src/lib/api/session.test.ts` couvre la connexion vérifiée, le logout, le refus d'un contexte App et la réponse de login arrivée après logout. La CI et le crash-test navigateur restent nécessaires.

## Rotation de session BO (15/11/2026)

`currentBo()` renouvelle les tokens si l'access token expire dans moins de 30 secondes via `POST /apibo/auth/refresh`, puis vérifie l'identité avec le nouvel access token. Les appels simultanés partagent une seule rotation pour éviter le rejeu du refresh. Les réponses tardives ne peuvent pas restaurer une session déconnectée. En cas de refus ou d'expiration du refresh, la session en mémoire est effacée et l'accès reste fermé. Test de rotation ajouté dans `session.test.ts`.

La rotation est **déclenchée par les vérifications de session**, pas par une minuterie permanente ; un écran ouvert sans nouvelle vérification ne renouvelle pas la session. Les tokens restent exposés au JavaScript en mémoire : le transport serveur HttpOnly, les règles CSRF/CORS et les crash-tests navigateur sont encore nécessaires avant production.

### Isolation des rotations concurrentes

La rotation en cours est associée à la génération de session et à l'objet token d'origine. Une déconnexion ou une nouvelle connexion invalide ce rattachement : une requête tardive de l'ancienne session ne peut pas être réutilisée par la nouvelle. Un test simule deux vérifications BO concurrentes et exige un seul appel HTTP de refresh. Les tests CI restent nécessaires avant validation.

### Validation des dates de session

Les réponses de connexion et de renouvellement doivent contenir deux dates valides et futures : expiration de l'access token et du refresh token. Une réponse contenant une date absente, invalide ou déjà dépassée est refusée ; lors du renouvellement, la session locale est immédiatement invalidée. Un échec HTTP de renouvellement ferme également la session et n'entraîne pas de boucle de retry. Tests unitaires ajoutés pour les cas d'expiration et de refus.

## Tests du client HTTP (15/11/2026)

`src/lib/api/client.test.ts` couvre l'absence de cookies et de header Authorization sur les appels publics, l'envoi du Bearer sur les appels authentifiés, le refus des URL commençant par `//` et la propagation du statut/code d'erreur du backend. Les tests sont unitaires avec `fetch` simulé ; ils ne prouvent pas la configuration CORS réelle.

### Crash-test unitaire : déconnexion pendant le refresh

Un test supplémentaire retarde volontairement la réponse de `/apibo/auth/refresh`, déconnecte l'administrateur, puis libère la réponse. La vérification doit retourner `null` et aucun token renouvelé ne doit rétablir la session locale. Ce test ne remplace pas un crash-test HTTP réel : si le serveur a déjà effectué une rotation au moment de la déconnexion, la révocation côté backend doit être contrôlée séparément.

## Lot de durcissement client et session (15/11/2026)

Le client HTTP retire désormais explicitement les entêtes `Authorization`, `Cookie` et `Proxy-Authorization` sur les requêtes `public: true`, en plus de `credentials: omit`. Les chemins commençant par `//`, contenant un antislash ou des retours à la ligne sont rejetés avant `fetch`. Le code HTTP 204 n'est accepté comme succès que si `response.ok` ; les erreurs sans JSON ou dont les champs `message`/`code` ont un type inattendu reçoivent un message sûr. Ces contrôles ne remplacent pas la politique CORS côté serveur.

Les tests du client couvrent désormais ces entêtes, les chemins malformés, les erreurs vides et les payloads d'erreur invalides. Les tests de session couvrent en plus les refresh tokens déjà expirés à la connexion, les access tokens déjà expirés après rotation et le refus de renouveler lorsque la durée de vie du refresh est dépassée. Le mécanisme de session demeure éphémère et limité au BO. Exécuter la CI puis les crash-tests locaux avant validation fonctionnelle.

## Client BO authentifié pour les modules (15/11/2026)

Les futurs écrans des modules BO utilisent `boApi<T>('/apibo/...', init)` exporté par `src/lib/api/session.ts`, et non `api()` avec une gestion de Bearer propre à chaque module. Ce point d'entrée réutilise le refresh partagé, injecte l'access token courant, interdit les chemins hors `/apibo/`, les appels publics et l'injection manuelle de tokens ou de credentials. Le transport est explicitement `credentials: omit` tant que la session est éphémère. Une session absente entraîne `ApiError(401)` sans appel réseau ; un HTTP 401 du module invalide la session courante. Les réponses tardives arrivées après logout ou changement de session sont rejetées.

Les tests unitaires vérifient le Bearer, les chemins et options interdits, l'absence d'appel sans session, l'invalidation 401 et les réponses tardives. Ce mécanisme ne remplace pas les contrôles d'autorisation ACL côté backend, ni les tests d'intégration navigateur. Le passage futur aux cookies HttpOnly devra adapter ce point d'entrée central, sans multiplier les implémentations dans les modules.

### Correction des tests du client authentifié (15/11/2026)

Le mock Vitest de `./client` doit conserver l'export réel `ApiError` via `importOriginal`, en remplaçant uniquement `api` par un mock. Sans cela, les scénarios de refus HTTP échouent avec une erreur de mock, indépendamment du comportement de production. Pour le test de déconnexion pendant un appel module, attendre explicitement que le mock ait reçu la requête avant de déclencher le logout ; sinon la course est non déterministe et peut bloquer le test sur une promesse jamais résolue. Le test attache son assertion de rejet dès le lancement de la requête pour éviter les rejets non gérés.
