# EIZO Events

- Tableau de bord interne à `/events`. Démonstration isolée à `/events/demo`, avec des données fictives et sans appels à la base.
- La migration `202611160001_eizo_events.sql` ajoute les tables et crée la fiche Les Rencontres EIZO 2026. Appliquer d’abord à une base Supabase de prévisualisation.
- Créer des comptes individuels dans Supabase Auth, puis renseigner `EIZO_EVENTS_USERS` avec `adresse=admin,adresse=reader`. Les comptes doivent avoir une adresse vérifiée. Le rôle lecteur donne accès aux fiches et exports. Le rôle administrateur permet aussi la création, l’import et le suivi.
- Configurer `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` pour cette base uniquement. Ne pas donner au déploiement de prévisualisation les identifiants ou clés de production.

## Ingestion

Shopify publie la page 200302920022. Son contenu référence Globo Form Builder, formulaire 171416. Le dépôt existant contient un service séparé de réservation de créneaux. Le branchement Globo doit passer par une intégration serveur qui écoute les nouvelles soumissions et laisse les réglages de notification Globo en place.

Pour chaque événement, configurer `EIZO_EVENTS_SOURCES` sous la forme `slug=secret,slug=secret`, avec un secret aléatoire distinct d’au moins 32 caractères par événement. Depuis l’intégration serveur, envoyer un POST JSON à `/api/events/ingest/<slug>` avec `Authorization: Bearer <secret>`. Conserver le secret exclusivement côté serveur. L’événement doit déjà exister.

Champs JSON : `source_id` (identifiant d’origine stable, identique dans l’import et l’intégration), `registered_at` (ISO 8601 avec décalage horaire), `name`, `email`, et en option `company` et `sector`. Une répétition du même identifiant pour le même événement retourne `inserted: 0` et conserve le suivi. En cas de 503, relancer avec le même identifiant. Une intégration Zapier ou équivalente doit vérifier qu’elle reçoit bien l’ID et l’horodatage d’origine. Valider le mappage avec un formulaire de test avant tout branchement.

## Import historique

Exporter les soumissions depuis Globo. Le compte Globo doit avoir accès à l’export. Convertir chaque lot du CSV en JSON à partir des intitulés réels de colonnes. Les dates doivent inclure leur fuseau, par exemple `2026-11-16T10:00:00+01:00`. Si le CSV ne fournit pas l’identifiant d’origine, le récupérer dans Globo avant d’importer pour que l’historique se déduplique aussi par rapport à l’ingestion.

```shell
python scripts/normalize-eizo-events.py export.csv import.json --id "ID" --timestamp "Date" --name "Nom" --email "E-mail" --company "Entreprise" --sector "Secteur"
```

Sélectionner l’événement puis choisir **Importer l’historique**. Les lots sont limités à 1 000 lignes et 750 Ko. Garder ces fichiers dans un emplacement privé. Les synthèses quotidiennes et hebdomadaires sont exportables en CSV, avec des semaines démarrant le lundi et des dates calculées dans le fuseau Europe/Paris. Un envoi automatique nécessite un planificateur et des destinataires configurés séparément.
