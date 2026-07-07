# Pan

[![CI](https://github.com/cedric-jimenez/pan/actions/workflows/ci.yml/badge.svg)](https://github.com/cedric-jimenez/pan/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)
[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue)](LICENSE)

Application web (Next.js) de gestion de photos de terrain de salamandres tachetées (*Salamandra salamandra*). L'app extrait les données GPS/EXIF, exécute des pipelines de détection/segmentation/identification par IA, et permet aux chercheurs de suivre des individus.

## Stack

- **Framework**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js v5 (credentials + Google OAuth)
- **Base de données**: PostgreSQL + Prisma ORM, avec l'extension **pgvector** pour les embeddings DINOv2 (384 dimensions)
- **Stockage**: Cloudflare R2 (API S3 compatible)
- **Cartes**: Leaflet / react-leaflet
- **Tests**: Vitest + React Testing Library

Le pipeline IA (détection YOLOv8, segmentation, embedding, vérification) est géré par un microservice Python séparé, hébergé sur Railway.

## Démarrage

Tout le développement se fait dans le dossier `photo-gps-app/` :

```bash
cd photo-gps-app
npm install
npm run dev          # http://localhost:3000
```

## Commandes utiles

```bash
npm run build         # Build de production
npm run lint           # Lint
npm run lint:fix       # Lint + fix automatique
npm run format          # Formatage (Prettier)
npm run type-check      # Vérification TypeScript

npm test                # Tests (watch mode)
npm test -- --run        # Tests (CI mode)
npm run test:coverage    # Tests avec couverture

npx prisma generate      # Régénérer le client Prisma
npx prisma db push       # Appliquer le schéma à la base
npx prisma studio        # Interface graphique de la base
```

Voir `CLAUDE.md` pour une documentation détaillée de l'architecture.

## Variables d'environnement

Voir `photo-gps-app/.env.example` pour la liste complète (base de données, R2, Google OAuth, URL du microservice IA, etc).

## CI

`.github/workflows/ci.yml` exécute lint, tests (avec seuils de couverture) et build à chaque PR vers `main`/`master` et à chaque push sur les branches `claude/**`.

## Licence

Ce projet est distribué sous licence [GNU General Public License v3.0 (ou ultérieure)](LICENSE).
