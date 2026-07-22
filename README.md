# EIZO Rendez-vous API

Backend Next.js 15 (App Router) que j'ai développé pour la prise de rendez-vous de démonstration EIZO ColorEdge.

## Architecture

- `POST /api/reservation/create` : création d'une demande de rendez-vous
- `GET /api/reservation/action?token=...&action=confirm|cancel` : confirmation / annulation depuis l'email

Les rendez-vous sont stockés dans le Metaobject Shopify existant `rendez_vous_fred`.

## Prérequis

- Node.js 18+
- Un compte Vercel
- Accès Admin API de la boutique Shopify

## Installation locale

```bash
npm install
```

## Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner les valeurs.

- `SHOPIFY_STORE_DOMAIN` : domaine `.myshopify.com` (ex: `eizo.myshopify.com`), pas le domaine public.
- `SHOPIFY_ADMIN_ACCESS_TOKEN` : token Admin API de l'application Shopify installée.
- `SHOPIFY_API_VERSION` : version de l'API Shopify (par défaut `2024-10`). `2026-07` n'est pas disponible.
- `SHOPIFY_METAOBJECT_TYPE` : handle/type du metaobject (`rendez_vous_fred`).
- `SMTP_*` : serveur SMTP pour l'envoi des emails.
- `EMAIL_FROM` / `EMAIL_TO` : expéditeur et destinataire des notifications Fred.
- `API_BASE_URL` : URL publique de l'API (pour les liens des emails).

## Lancer en local

```bash
npm run dev
```

## Connexion Shopify

L'application "EIZO Rendez-vous" doit être installée sur la boutique et disposer des scopes `read_metaobjects` et `write_metaobjects`.

Le code récupère dynamiquement les clés de champs du Metaobject depuis la définition Shopify. Ajustez `SHOPIFY_METAOBJECT_TYPE` si le handle est différent (ex: `rendez-vous-fred`).

## Déploiement Vercel

1. Pousser le repo sur GitHub.
2. Importer le projet dans Vercel.
3. Configurer les variables d'environnement dans Vercel (mêmes que `.env.example`).
4. Déployer.

## Sécurité

- Validation Zod des entrées.
- Génération de token UUID v4.
- Gestion CORS sur la route `create`.
- Les secrets ne sont jamais commités.

## Auteur

Kyliann Le Garrec
