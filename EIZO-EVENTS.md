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

## Connexion et rôles

1. Appliquer la migration `supabase/migrations/202611160002_eizo_event_reports.sql` sur la base Supabase.
2. Créer les comptes dans Supabase Auth (adresse vérifiée), puis renseigner `EIZO_EVENTS_USERS` : `adresse=admin,adresse=reader`.
3. Configurer `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` pour cette base. Ne pas donner au déploiement de prévisualisation les identifiants de production.
4. Rôle `reader` : consultation et exports. Rôle `admin` : changement de statut.

## Synthèse e-mail hebdomadaire

Vercel Cron (`vercel.json`) appelle `GET /api/events/reports/semaine` chaque lundi à 07:00 UTC (8 h à Paris). Le mail contient le résumé de la semaine écoulée (nouvelles demandes, évolution, statuts, détail par événement, liste des nouvelles demandes) et les liens vers le back-office (statistiques, synthèse détaillée de la semaine, export Excel).

- **Mode dev (par défaut)** : envoi uniquement à `klegarrec@feeder.fr` (ou `EIZO_EVENTS_REPORT_DEV_TO`), objet préfixé `[DEV]`.
- **Mode production** : `EIZO_EVENTS_REPORT_MODE=production` sur le déploiement de production → envoi à l'équipe (liste dans `src/lib/report-recipients.ts`, ou `EIZO_EVENTS_REPORT_TO`).
- **Test immédiat** (toujours au seul développeur, sans attendre lundi) :
  `curl -H "Authorization: Bearer $CRON_SECRET" "https://eizo-rendezvous-api-vercel-app.vercel.app/api/events/reports/semaine?test=1"`

Variables requises : `CRON_SECRET` (≥ 32 caractères), `EIZO_EVENTS_REPORT_FROM` (adresse `@eizo.fr` acceptée par le SMTP ; à défaut `EMAIL_FROM` puis `SMTP_USER`), SMTP déjà configuré. Un envoi par semaine et par mode, tracé dans `eizo_event_reports`.

**Après l'événement** (Rencontres EIZO du 03/12/2026) : retirer le cron de `vercel.json` pour arrêter les synthèses. L'historique reste consultable dans le back-office.

Rendu de démonstration : `/events/demo/synthese`.

## Migrations à appliquer

1. `supabase/migrations/202611160002_eizo_event_reports.sql`
2. `supabase/migrations/202611160003_eizo_event_registrations.sql`

## Variables d'environnement

Voir `.env.example` — section « EIZO EVENTS ».
