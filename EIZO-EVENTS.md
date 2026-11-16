# EIZO Events — Back-office rendez-vous

Back-office privé à `/events` pour le suivi des rendez-vous pris via le formulaire des événements EIZO (Rencontres EIZO 2026, EURONAVAL, etc.). Démonstration sans base à `/events/demo`.

Les données proviennent directement des tables `bookings` et `organizers` existantes : chaque réservation faite sur eizo.fr (widget « Prenons rendez-vous ») apparaît automatiquement dans le back-office. Les e-mails de confirmation et de notification organisateur existants ne sont pas modifiés.

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

La route `GET /api/events/reports/semaine` envoie une synthèse agrégée (nouvelles demandes de la semaine écoulée, total actifs, répartition par statut et par événement, comparaison avec la semaine précédente) à `EIZO_EVENTS_REPORT_TO`. Elle n'agit que le lundi et uniquement si `VERCEL_ENV=production` **et** `EIZO_EVENTS_REPORT_MODE=production` — les envois sont donc désactivés par défaut.

Configuration :

- `EIZO_EVENTS_REPORT_TO` : destinataires, séparés par des virgules.
- `EIZO_EVENTS_REPORT_ORIGIN` : URL HTTPS du back-office (lien dans le mail).
- `EIZO_EVENTS_REPORT_FROM` : adresse `@eizo.fr` autorisée par le serveur SMTP.
- `CRON_SECRET` : secret aléatoire ≥ 32 caractères, envoyé en `Authorization: Bearer`.
- `EIZO_EVENTS_REPORT_MODE=production` : n'activer qu'après validation d'un envoi de test.

Planifier dans Vercel Cron (ou équivalent) un GET authentifié chaque lundi matin (Europe/Paris) sur `/api/events/reports/semaine`. Une variante `/api/events/reports/jour` existe pour une synthèse quotidienne.

**Après l'événement** (ex. Rencontres EIZO du 03/12/2026) : supprimer le cron et les variables `EIZO_EVENTS_REPORT_*` / `CRON_SECRET` pour arrêter les synthèses, et passer l'organizer à `active = false` pour fermer le formulaire. L'historique des rendez-vous reste consultable dans le back-office.

Test sans envoi réel : `POST /api/events/reports/preview` (preview Vercel uniquement, destinataire `EIZO_EVENTS_TEST_TO`). Rendu de démonstration : `/events/demo/synthese`.

## Variables d'environnement

Voir `.env.example` — section « EIZO EVENTS ».
