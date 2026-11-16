# EIZO Events — Back-office rendez-vous

Back-office privé à `/events` pour le suivi des rendez-vous pris via le formulaire des événements EIZO (Rencontres EIZO 2026, EURONAVAL, etc.). Démonstration sans base à `/events/demo`.

Deux sources de données :

- **Widget de réservation** (IBC, EURONAVAL…) : tables `bookings` et `organizers`, lues telles quelles.
- **Formulaires Shopify Globo** (Rencontres EIZO 2026, page `rencontre-2026`, formulaire Globo `171416`) : ces demandes ne passent **pas** par le widget. Le script `shopify-rencontre-2026-capture.html`, à coller dans le HTML de la page Shopify, envoie une copie de chaque demande à `POST /api/events/inscriptions/rencontre-2026`, qui l'enregistre dans `eizo_event_registrations` (une ligne par e-mail). Ces inscriptions apparaissent dans le back-office comme l'événement « Les Rencontres EIZO 2026 » (voir `src/lib/registrations.ts`). Les inscriptions antérieures à la pose du script sont à importer depuis l'export CSV Globo.

## Fonctionnalités

- **Vue d'ensemble** (`/events`) : rendez-vous actifs, RDV du jour, demandes de la semaine (avec comparaison à la semaine précédente), confirmés, derniers rendez-vous, courbe d'évolution jour/semaine, comparaison par événement.
- **Fiche événement** (`/events?event=<slug>`) : mêmes indicateurs limités à l'organizer correspondant.
- **Synthèse hebdomadaire** : navigable semaine par semaine — nouvelles demandes, total actifs, évolution vs semaine précédente, répartition confirmés/en attente/refusés, graphique des 7 jours, liste des nouveaux rendez-vous, export CSV de la semaine.
- **Rendez-vous** : recherche (nom, e-mail, téléphone, besoin, usage, événement), filtres statut et dates de RDV, pagination, détail produit demandé.
- **Exports** : Excel (.xlsx, onglets Rendez-vous + Par semaine) et CSV, global ou par événement, y compris par semaine.
- **Statuts** : les admins peuvent faire évoluer le statut d'un rendez-vous (en attente, confirmé, refusé, annulé, terminé, no-show). Les statuts `cancelled` et `refusé` ne comptent pas comme actifs.
- **Mail hebdomadaire** : synthèse agrégée envoyée chaque lundi (voir ci-dessous).

## Connexion, rôles et cloisonnement

Les comptes se créent dans Supabase Auth (adresse confirmée). Les droits sont dans la table **`eizo_event_access`** :

| colonne | rôle |
|---|---|
| `email` | adresse du compte (minuscules) |
| `role` | `admin` (peut changer les statuts) ou `reader` (lecture + exports) |
| `events` | slugs visibles, ex. `{rencontre-2026}` ; `{*}` = tous |
| `weekly_report` | reçoit la synthèse du lundi |

Une personne ne voit **que** les rendez-vous de ses événements : tableau de bord, exports, changements de statut et mail du lundi sont filtrés. Sans ligne dans la table, aucun accès (sauf `EIZO_EVENTS_USERS=email=admin`, conservé en secours).

## Synthèse e-mail tous les deux jours

Vercel Cron (`vercel.json`) appelle chaque matin à 07:00 UTC `GET /api/events/reports/2jours` ; la synthèse ne part **qu'un jour sur deux** et couvre les deux jours précédents (heure de Paris). Chaque destinataire (`eizo_event_access.weekly_report = true`) reçoit uniquement ses événements, avec la fiche détaillée de chaque nouvelle demande (entreprise, fonction, contact, créneau, produit, message) et le lien vers le back-office.

**Contenu** : uniquement les Rencontres EIZO (`EIZO_EVENTS_REPORT_EVENTS`, défaut `rencontre-2026`) — compte à rebours, chiffres clés, courbe des 14 derniers jours, créneaux avec les noms, fiche complète de chaque nouvel inscrit et liste intégrale des inscrits.

**Arrêt automatique** : seuls les événements datés sont suivis, jusqu'à 2 jours après leur fin (Rencontres EIZO : dernière synthèse le 05/12/2026, puis plus rien). Rien à désactiver à la main.

- **Mode dev (défaut)** : envoi uniquement à `klegarrec@feeder.fr`, objet préfixé `[DEV]`.
- **Mode production** : `EIZO_EVENTS_REPORT_MODE=production` dans Vercel.
- **Test immédiat** : `curl -H "Authorization: Bearer $CRON_SECRET" ".../api/events/reports/2jours?test=1"` (ajouter `&as=adresse` pour la vue d'une personne).

## Administration (depuis le back-office)

Les admins disposent, en bas du tableau de bord, de :

- **Synthèse e-mail** : mode (test = moi seul / équipe), prochain envoi, dernier envoi prévu, historique ; bouton « M'envoyer un aperçu maintenant » (éventuellement dans la version d'une autre personne) ; bouton pour envoyer la synthèse à toute l'équipe (avec confirmation) ou repasser en test. Le réglage est stocké dans `eizo_event_settings` (`report_mode`) et n'agit que sur le déploiement de production.
- **Équipe** : liste des accès, état du compte (pas encore invité / compte créé / dernière connexion) et bouton « Inviter » qui envoie un lien (7 jours, usage unique) pour choisir son mot de passe.
- **Fiches** : « Compléter la fiche » sur chaque inscription (entreprise, fonction, téléphone, créneau, message) et « Ajouter une inscription » (appel, salon…). Une réinscription via le formulaire ne vide jamais un champ déjà complété.

## Fiabilité

- Capture : chaque inscription est gardée dans le navigateur jusqu'à confirmation du serveur, et renvoyée à la visite suivante sinon.
- API publique : origines eizo.fr uniquement, 20 envois/heure/IP et 200/heure au total au maximum (`eizo_event_ingest_log`, IP hachée).
- Sessions : renouvelées automatiquement (`src/middleware.ts`), connexion valable 14 jours.

## Mots de passe

Chaque personne autorisée choisit son mot de passe : lien « Première connexion ou mot de passe oublié ? » sur la page de connexion → e-mail avec un lien signé valable 30 minutes, à usage unique (`/events/mot-de-passe`).

## Pas de statut

Le back-office n'affiche plus de statut : chaque rendez-vous est présenté sous forme de fiche détaillée. Seules les demandes annulées par le participant (lien de gestion du widget) ne sont plus comptées.

## Migrations à appliquer

1. `supabase/migrations/202611160002_eizo_event_reports.sql`
2. `supabase/migrations/202611160003_eizo_event_registrations.sql`
3. `supabase/migrations/202611160004_eizo_event_access.sql`
4. `supabase/migrations/202611160005_eizo_events_password_links.sql`
5. `supabase/migrations/202611160006_eizo_events_settings_and_rate_limit.sql`

## Variables d'environnement

Voir `.env.example` — section « EIZO EVENTS ».
