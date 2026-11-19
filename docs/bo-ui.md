# Interface BO commune

Le BO hôte rend un shell unique via `src/routes/+layout.svelte` et
`src/lib/components/AppShell.svelte`. Les routes `/`, `/login`, `/auth/*`
(activation et récupération) et `/two-factor` (challenge pré-session)
sont rendues **sans shell authentifié** via `src/lib/bo/public-routes.ts`,
importé relativement depuis le layout afin d'être résolu par Svelte/TypeScript.
Le shell appelle `currentBo()` avant de rendre les pages privées ; il persiste
pendant les navigations internes.
Le cookie HttpOnly et le Bearer restent gérés dans `src/lib/api/session.ts`.

La sidebar contient Dashboard et les déclarations installées dans
`src/lib/modules/*/navigation.ts`, uniquement après un appel de lecture
autorisé par les ACL PHP. Aucun rôle n'est interprété côté Svelte.
Les liens et l'état de chargement sont partagés avec le dashboard via
`src/lib/bo/context.ts`. L'élément actif suit la route courante.

La topbar contient un menu administrateur avec la déconnexion. Le BO
ne crée pas de lien Profil tant qu'aucune route Profil effective n'existe.
Les modules autorisés peuvent exporter `boAlerts(check)` dans leur
`navigation.ts` ; le shell affiche leurs alertes `{ id, path, message: { fr,
en } }` avec compteur. Une réponse refusée ou indisponible n'expose
aucune alerte, et le destinataire doit rester la route du module autorisé.
Le contenu et les règles d'alerte appartiennent aux modules.

Ce mécanisme reprend l'AppShell et les composants partagés de XCore
conformément à l'ADR 0004, sans recopier son menu figé ni son auth.
Les libellés de shell suivent `uiLanguage` et le style commun reste
dans `src/app.css`.

## Validation non clôturée

Exécuter `npm run qa`, vérifier les CI du BO et des modules, puis sur XT :
Dashboard → Admins → Users → Settings → Dashboard, menu persistant et actif,
ACL, alertes, déconnexion, rechargement avec refresh HttpOnly et session expirée.
Seuls les crash-tests utilisateur confirment l'intégration réelle.

## Catalogue de composants réutilisables (hérité des principes XCore)

Le BO hôte fournit désormais `src/lib/components/Button.svelte`,
`Alert.svelte`, `InputField.svelte`, `DataTable.svelte` et
`Pagination.svelte`. Les modules doivent préférer ces primitives,
sans les recopier. Aucun de ces composants n'appelle l'API.

- `Button` reçoit les props HTML du bouton, `variant`
  (`primary`, `secondary`, `danger`) et `loading`.
- `Alert` reçoit `kind` (`error`, `success`, `info`) et expose
  le rôle ARIA approprié.
- `InputField` associe label et saisie, avec `bind:value`.
- `DataTable` reçoit lignes, colonnes, actions, filtres, tri et pagination
  optionnels. Il n'interprète aucune ACL et n'effectue aucun fetch.
- `Pagination` reçoit `page`, `limit` (10/20/50/100), `total`,
  `onPageChange` et `onLimitChange`. Le défaut est 20 résultats.

Les libellés génériques FR/EN sont centralisés dans `components/texts.ts`,
synchronisés avec `uiLanguage`. Les chaînes métier restent dans les modules.
Pour les tableaux avec édition en ligne complexe, conserver le HTML natif
jusqu'à l'existence d'un besoin avéré de snippets de cellule : éviter une
abstraction plus large sans besoin.

Tests unitaires des utilitaires de pagination, tri et affichage requis.

L'étiquette accessible des filtres de tableau suit aussi la langue d'interface.

## Actualisation des alertes

Après une opération susceptible de modifier les avertissements, un module
peut déclencher `window.dispatchEvent(new Event('symsvel:alerts-changed'))`.
Le shell réinterroge alors uniquement les providers des modules autorisés ;
il ne recalcule aucune règle métier et ne déconnecte pas l'administrateur.
L'abonnement est nettoyé lors du démontage du shell.

## Compatibilité entre les sources BO et les modules

Les pages des modules installés peuvent importer les composants publics du BO
depuis `src/lib/components/`. Lorsqu'un module adopte de nouvelles primitives
BO, le **BO natif du projet doit être actualisé en premier**. Dans un projet
SymSvel en canal `dev` :

```bash
symsvel update bo
symsvel update
```

Ces commandes ont des responsabilités distinctes :
`symsvel update bo` suit la source Git BO correspondant au canal du projet,
applique les nouveautés natives et reconstruit le BO ;
`symsvel update` passe par Composer et synchronise les modules, mais n'installe
pas à lui seul les nouveaux fichiers natifs du BO.

Un échec Vite `UNRESOLVED_IMPORT` pour `components/Button.svelte`,
`components/Alert.svelte` ou `components/DataTable.svelte`, alors que
ces fichiers existent dans le dépôt BO, indique un assemblage local dont les
sources sont désalignées ou absentes. Ne pas recopier les composants dans les
modules et ne pas « réparer » leurs imports relatifs tant que leur résolution
a été confirmée par l'assemblage CI. Vérifier d'abord que la mise à jour native
s'est effectivement terminée (elle est transactionnelle et peut restaurer
l'état précédent en cas d'échec).

Le canal est enregistré dans `backend/.symsvel/project.json`. Ne pas changer
ce fichier manuellement pour débloquer une version : il fait partie de la
provenance gérée par CLI/Tooling. Les CI isolées des modules assemblent un
BO `dev` neuf et ne prouvent pas à elles seules le comportement d'un projet
historique possédant encore un BO natif antérieur. Le crash-test XT reste requis.

## Modales d'édition et d'invitation

`src/lib/components/Modal.svelte` repose sur l'élément HTML natif
`dialog.showModal()`. La page module possède l'état `open`, le titre, les
champs et le rappel `onClose`. Le composant gère le voile, l'accessibilité
(nom accessible, fermeture par Échap, focus géré par le navigateur) et ne
contient ni API ni droits métier. Ne pas recopier un overlay dans chaque module.

Les onglets et les accordéons restent du HTML natif piloté par le module.
Les tableaux réutilisent `DataTable` + `Pagination` avec une recherche,
un tri et un découpage gérés par l'écran, comme dans XCore. L'API garde ses
contrôles d'accès et reste la seule autorité pour les mutations.

## Traductions statiques générées (17/11/2026)

Les dictionnaires TypeScript produits par Languages et écrits en développement par Tooling sont attendus sous `src/lib/i18n/generated/<code-iso>.ts`. La fonction `generatedTranslation()` dans `src/lib/i18n/generated-translations.ts` les découvre au **build Vite** avec `import.meta.glob` et résout les objets imbriqués. Le fallback est effectué à la clé vers le dictionnaire français, sans modifier la langue du compte.

Les libellés des composants natifs BO (`components.*`) utilisent ces dictionnaires lorsque la clé existe, avec repli sur les valeurs FR/EN intégrées. Les pages de modules qui utilisent leur propre système d'i18n doivent raccorder leurs clés au même helper ; les pages Languages utilisent `languages.*` et `languages.translations.*`. Les fonctions de mise en forme dynamiques restent portées par le code. Aucun chargement de BDD/Redis à l'exécution et aucun serveur Node en production. Un nouveau build/CD est nécessaire après toute modification de fichier généré.

## Connexion avec module 2FA optionnel (17/11/2026)

La connexion BO utilise toujours `/apibo/auth/browser/login`. En présence d'un provider 2FA exigeant une seconde preuve, Auth répond avec un challenge HTTP 202. Le client BO reconnaît cette réponse, conserve temporairement le challenge **en mémoire et dans `sessionStorage` propre à l'onglet** (sans session authentifiée ni cookie de rafraîchissement) et dirige vers la route `/two-factor` fournie uniquement par le module `symsvel-framework/module-two-factor`. Sans ce module, les parcours classiques et les routes du BO restent inchangés.

Après validation, `completeBoSecondFactor` appelle `/apibo/auth/browser/second-factor` avec le cookie HttpOnly géré par le serveur, vérifie `/apibo/auth/me` puis conserve uniquement l'access token en mémoire. La réponse peut afficher une seule fois les codes de secours ; les secrets refresh ne transitent pas par JavaScript. Le challenge persiste lors d'un rechargement de page dans le même onglet, jusqu'à son expiration côté serveur (5 minutes). Une nouvelle connexion, la déconnexion, une valeur invalide/expirée ou une validation 2FA réussie purgent ce stockage. Si `sessionStorage` est interdit par le navigateur, le challenge reste en mémoire jusqu'au rechargement. La synchronisation du module Svelte et les CT de navigation sont requis avant release.

La route `/two-factor` ne doit **jamais** monter `AppShell` : à ce stade, le
challenge HTTP 202 n'a pas encore émis de cookie refresh, donc un
`/apibo/auth/browser/refresh` déclenché par `currentBo()` retournerait
légitimement `401 invalid_session` et interromprait le parcours. La route
reste publique uniquement **au niveau du rendu Svelte** ; aucun token BO
n'est accordé sans validation du code TOTP ou de secours par Auth. Le test
`src/lib/bo/public-routes.test.ts` vérifie les routes pré-session et le
maintien de la protection des routes privées. En CT, vérifier le parcours
login → challenge 202 → saisie 2FA → dashboard **sans appel prématuré au
refresh**, ainsi que le rechargement du dashboard avec cookie valide.

### Persistance pré-session du challenge (18/11/2026)

Conformément au parcours XCore historique, le challenge 2FA est restauré depuis
`sessionStorage['symsvel.bo.second-factor.challenge']` si la navigation a
réinitialisé le module Svelte/JavaScript. Ce stockage est limité à l'onglet et
ne contient **ni token access, ni token refresh, ni mot de passe**. Il contient
le challenge opaque et, uniquement lors de l'enrôlement, la clé et l'URI TOTP
déjà transmises à la page par Auth ; ces données sont sensibles, doivent rester
éphémères et ne sont jamais recopiées vers `localStorage`.

L'accès au stockage est protégé contre les refus du navigateur, les contenus
corrompus ou anormalement volumineux sont supprimés, et l'expiration de la
réponse Auth est revérifiée à chaque récupération. Le serveur conserve
l'autorité sur l'expiration réelle, les essais TOTP et la consommation du
challenge. Les tests unitaires simulent un rechargement de module, une
expiration, un stockage inaccessible et la suppression après succès, nouvelle
connexion et déconnexion. Crash-test local encore requis.

### QR TOTP du module TwoFactor (18/11/2026)

Le module optionnel TwoFactor affiche un QR code créé **localement dans le navigateur**
à partir de l'URI `otpauth://` transmise par Auth. Les dépendances
`qrcode@^1.5.4` et `@types/qrcode@^1.5.5` sont installées par le BO hôte ;
elles ne sont incluses dans le build statique que lorsque la route du module
les importe. Aucun service QR externe et aucun changement des tokens ou cookies BO.
La clé manuelle reste disponible dans un volet de secours.

Sur un projet existant, lancer `symsvel update bo` **avant** de synchroniser
la nouvelle version de TwoFactor pour disposer des dépendances npm. Le build
statique et le CT local du scan restent requis.

## Première fondation du Design System BO (19/11/2026)

Le thème est une responsabilité du BO hôte : `src/lib/theme/bo-theme.ts` gère le choix `system`, `light` ou `dark`, sans API ni changement d'authentification. Le layout appelle `installBoTheme` y compris pour le login et la 2FA. Le thème système suit `prefers-color-scheme` et les changements de préférence d'un autre onglet. Le choix utilisateur sera exposé par le menu administrateur et enregistré sous `localStorage['symsvel.bo.theme']` (pas de données sensibles). Le composant ne recharge jamais la page. Les tests unitaires vérifient les préférences. Les couleurs communes restent des jetons CSS gérés par le BO et non par les modules.

### Choix de thème dans AppShell (19/11/2026)

Le menu du compte propose un sélecteur accessible **Apparence : Système / Clair / Sombre**. Les libellés appartiennent aux textes natifs `bo.system.shell.*`, avec repli FR/EN. Changer de thème ne relance pas l'authentification, ne change pas de route et ne recharge pas le BO. Aucun rôle ni ACL supplémentaire n'est nécessaire pour une préférence locale de présentation.

### Jetons graphiques communs (19/11/2026)

Le BO hôte expose dans `src/app.css` les jetons `--bo-bg`, `--bo-surface`, `--bo-input`, `--bo-text`, `--bo-muted`, `--bo-border`, `--bo-primary`, `--bo-focus`, `--bo-danger`, états et sidebar. Ils sont définis pour clair, sombre et préférence système sans JavaScript préalable. Les composants natifs consomment ces jetons ; la modale HTML native en hérite aussi. Les couleurs sont provisoires avant confrontation au ZIP HP : aucune approximation ne doit être présentée comme un code couleur HP vérifié. Les modules devront progressivement migrer leurs CSS codés en dur vers ce même contrat.

Le layout importe le helper de thème par chemin relatif (`../lib/theme/bo-theme`) : pour les fichiers du routeur, le module TypeScript de résolution `#lib` n'est pas universellement accepté pendant le contrôle Svelte. Ce choix suit le pattern existant des routes publiques et évite d'introduire un alias parallèle.
