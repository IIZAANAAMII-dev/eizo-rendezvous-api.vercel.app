# EIZO Rendez-vous API

Backend Next.js 15 (App Router) pour la prise de rendez-vous de démonstration EIZO ColorEdge : Back Office Shopify embedded app + widget de réservation Theme App Extension, données stockées dans Supabase.

## Architecture

- **Back Office Shopify** (`/shopify/*`) : dashboard, gestion des experts (`organizers`), disponibilités, réservations. Accessible en tant qu'app embedded Shopify.
- **API admin** (`/api/admin/*`) : CRUD utilisé par le Back Office, scopé par `shopify_connection_id` (résolu depuis le paramètre `shop`).
- **API publique** (`/api/public/*`) : consommée par le widget Theme App Extension côté storefront.
  - `GET /api/public/organizers` / `GET /api/public/organizers/[id]`
  - `GET /api/public/availability/[organizerId]?date=YYYY-MM-DD`
  - `POST /api/public/bookings`
- **Page de réservation autonome** (`/booking`, `/booking/[id]`) : liste des experts + calendrier, hors contexte Shopify.
- **Extension Shopify** (`extensions/booking-widget`) : Theme App Extension qui injecte le widget de réservation sur le storefront (popup ou bouton fixe selon les réglages du bloc).
- **Legacy** : `/api/booking/[organizerSlug]/*` et `/api/reservation/action` restent en place car câblés à l'App Proxy Shopify déclaré dans `shopify.app.toml` (`[app_proxy]`) et aux liens de confirmation/annulation envoyés par `lib/mail.ts`. Non utilisés par le widget actuel (qui appelle `/api/public/*` directement).

Les rendez-vous sont stockés dans Supabase (tables `organizers`, `availability`, `availability_slots`, `blocked_dates`, `booking_settings`, `bookings`, `appointments`, `shopify_connections`).

## Prérequis

- Node.js 18+
- Un compte Vercel
- Un projet Supabase
- Une app Shopify Partner configurée (Theme App Extension + Admin API)

## Installation locale

```bash
npm install
```

## Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner les valeurs (Supabase, Shopify OAuth, SMTP, `API_BASE_URL`).

## Lancer en local

```bash
npm run dev
```

## Déploiement Vercel

1. Pousser le repo sur GitHub.
2. Importer le projet dans Vercel.
3. Configurer les variables d'environnement dans Vercel (mêmes que `.env.example`).
4. Déployer.

## Sécurité

- Validation Zod sur la plupart des routes d'entrée.
- Génération de token UUID v4 pour les liens de confirmation/annulation.
- CORS géré via `lib/cors.ts` (whitelist) pour les routes publiques.
- Les secrets ne sont jamais commités.

## Auteur

Kyliann Le Garrec
