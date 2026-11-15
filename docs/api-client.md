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

Pass `public: true` for endpoints that must never send a token or cookies, such as login or unauthenticated reference data. The client removes any Authorization header and sets `credentials: 'omit'`. Non-public requests can temporarily receive `accessToken` explicitly; automatic session refresh, token storage and logout are deliberately **not** implemented here because Auth is developed separately. Do not duplicate its session lifecycle.

The client uses `PUBLIC_API_URL` when set; otherwise, in a browser, it resolves `bo.example` to `backend.example`. Outside the browser an explicit URL is required. The client accepts root-relative paths only.

Responses follow the SymSvel envelope (`{data: ...}`, `{error: {code, message}}`, or HTTP 204). Errors throw `ApiError` with HTTP status and optional API code.

## Validation

Run `npm run check`, `npm run lint`, `npm run build` and `npm run test:unit -- --run`. Full QA and real browser/backend crash tests are required before completion. Verify backend route contracts, CORS and Auth integration separately.

## Première passe visuelle BO (14/11/2026)

Les vues `/login` et `/dashboard` reprennent les styles et la structure de XCore (`src/app.css`, coque d'authentification et coque BO). L'accueil redirige vers `/login`. Le formulaire envoie une requête publique `POST /apibo/auth/login` mais **ne crée aucune session côté navigateur** : le contrôleur Auth et le transport de session restent à raccorder. En attendant, même une réponse HTTP réussie ne donne pas accès au dashboard ; celui-ci redirige vers la connexion. Il ne faut pas présenter cette étape comme une authentification fonctionnelle.

Prochain raccordement : définir et tester la réponse du contrôleur Auth, le stockage/transport sûr des tokens, la vérification d'accès au dashboard, le renouvellement et la déconnexion. Aucun écran 2FA, récupération de mot de passe ou création de compte App n'est inclus dans cette passe.

Le formulaire utilise provisoirement l'import relatif `../../lib/api/client`, résolu sans alias par TypeScript. La configuration actuelle de `tsconfig.json` étend `$app/tsconfig` et ne prouve pas la résolution de l'alias `#lib` dans `svelte-check` ; la CI valide ce point.

Les redirections internes SvelteKit passent par `resolve('/login')` avant `goto(...)`, conformément à la règle ESLint `svelte/no-navigation-without-resolve` du projet.

## Session BO éphémère (14/11/2026)

Le formulaire `/login` utilise maintenant `loginBo` (`src/lib/api/session.ts`) : `POST /apibo/auth/login`, puis vérification de l'identité par `GET /apibo/auth/me`. Le dashboard n'est rendu qu'après une nouvelle vérification `/me` ; en cas d'échec, retour à `/login`. La déconnexion appelle `POST /apibo/auth/logout` et efface immédiatement les secrets en mémoire, même si la requête réseau échoue.

**Limitation volontaire de sécurité :** les tokens restent uniquement en mémoire JavaScript, jamais en localStorage, sessionStorage ni cookie lisible par JS. Un rechargement complet perd donc la session et oblige à se reconnecter. Ce mécanisme transitoire ne remplace pas un transport serveur par cookies HttpOnly/Secure avec politique CSRF et CORS validée. Les tokens exposés au JavaScript restent vulnérables en cas de XSS. Pas de renouvellement automatique, de protection globale de toutes les routes ni de validation navigateur/backend : ne pas considérer cette passe comme prête pour la production.

## Prévention des courses de session

Chaque tentative de connexion et déconnexion incrémente une génération de session. Une réponse tardive de login ou de vérification `/me` ne peut plus rétablir un état après déconnexion ou remplacer une session plus récente. `src/lib/api/session.test.ts` couvre la connexion vérifiée, le logout, le refus d'un contexte App et la réponse de login arrivée après logout. La CI et le crash-test navigateur restent nécessaires.

## Rotation de session BO (15/11/2026)

`currentBo()` renouvelle les tokens si l'access token expire dans moins de 30 secondes via `POST /apibo/auth/refresh`, puis vérifie l'identité avec le nouvel access token. Les appels simultanés partagent une seule rotation pour éviter le rejeu du refresh. Les réponses tardives ne peuvent pas restaurer une session déconnectée. En cas de refus ou d'expiration du refresh, la session en mémoire est effacée et l'accès reste fermé. Test de rotation ajouté dans `session.test.ts`.

La rotation est **déclenchée par les vérifications de session**, pas par une minuterie permanente ; un écran ouvert sans nouvelle vérification ne renouvelle pas la session. Les tokens restent exposés au JavaScript en mémoire : le transport serveur HttpOnly, les règles CSRF/CORS et les crash-tests navigateur sont encore nécessaires avant production.

### Isolation des rotations concurrentes

La rotation en cours est associée à la génération de session et à l'objet token d'origine. Une déconnexion ou une nouvelle connexion invalide ce rattachement : une requête tardive de l'ancienne session ne peut pas être réutilisée par la nouvelle. Un test simule deux vérifications BO concurrentes et exige un seul appel HTTP de refresh. Les tests CI restent nécessaires avant validation.

### Validation des dates de session

Les réponses de connexion et de renouvellement doivent contenir deux dates valides et futures : expiration de l'access token et du refresh token. Une réponse contenant une date absente, invalide ou déjà dépassée est refusée ; lors du renouvellement, la session locale est immédiatement invalidée. Un échec HTTP de renouvellement ferme également la session et n'entraîne pas de boucle de retry. Tests unitaires ajoutés pour les cas d'expiration et de refus.
