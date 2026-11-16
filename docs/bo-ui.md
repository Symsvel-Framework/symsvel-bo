# Interface BO commune

Le BO hôte rend un shell unique via `src/routes/+layout.svelte` et
`src/lib/components/AppShell.svelte`. Les routes `/`, `/login` et `/auth/*`
(activation et récupération) restent publiques. Le shell appelle `currentBo()`
avant de rendre les pages privées ; il persiste pendant les navigations internes.
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
