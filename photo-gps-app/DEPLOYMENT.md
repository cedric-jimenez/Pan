# Guide de Déploiement sur Vercel

Ce guide vous aidera à déployer PhotoMap sur Vercel avec PostgreSQL et Blob Storage.

## Prérequis

- Un compte GitHub
- Un compte Vercel (gratuit) : https://vercel.com/signup

## Étape 1 : Préparer le Repository

Assurez-vous que tous vos changements sont pushés sur GitHub.

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

## Étape 2 : Créer un Projet Vercel

1. Allez sur https://vercel.com/dashboard
2. Cliquez sur **"Add New..."** → **"Project"**
3. Importez votre repository GitHub `Pan`
4. Sélectionnez le dossier racine : **`photo-gps-app`**

## Étape 3 : Configurer la Base de Données PostgreSQL

### Option A : Vercel Postgres (Recommandé)

1. Dans votre projet Vercel, allez dans l'onglet **Storage**
2. Cliquez sur **"Create Database"**
3. Sélectionnez **"Postgres"**
4. Choisissez la région la plus proche de vos utilisateurs
5. Cliquez sur **"Create"**

✅ Les variables d'environnement seront automatiquement ajoutées à votre projet !

### Option B : Neon Database (Alternative gratuite)

1. Allez sur https://neon.tech et créez un compte
2. Créez une nouvelle base de données
3. Copiez la `CONNECTION_STRING`
4. Dans Vercel, allez dans **Settings** → **Environment Variables**
5. Ajoutez :
   - `DATABASE_URL` = votre CONNECTION_STRING
   - `DIRECT_URL` = votre CONNECTION_STRING (même valeur)

## Étape 4 : Configurer le Stockage Blob

1. Dans votre projet Vercel, allez dans **Storage**
2. Cliquez sur **"Create Store"**
3. Sélectionnez **"Blob"**
4. Donnez-lui un nom (ex: `photomap-images`)
5. Cliquez sur **"Create"**

✅ La variable `BLOB_READ_WRITE_TOKEN` sera automatiquement ajoutée !

## Étape 5 : Configurer les Variables d'Environnement

Dans Vercel, allez dans **Settings** → **Environment Variables** et ajoutez :

### Variables Requises

```env
NEXTAUTH_SECRET=<générer-avec-openssl-rand-base64-32>
NEXTAUTH_URL=https://votre-app.vercel.app
```

### Pour générer NEXTAUTH_SECRET

Sur votre machine locale :

```bash
openssl rand -base64 32
```

Copiez le résultat dans la variable `NEXTAUTH_SECRET`.

## Étape 6 : Déployer l'Application

1. Cliquez sur **"Deploy"**
2. Attendez que le build se termine (~2-3 minutes)

## Étape 7 : Initialiser la Base de Données

Une fois déployé, vous devez créer les tables dans la base de données :

### Option A : Via Vercel CLI (Recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Lier votre projet
vercel link

# Exécuter les migrations
vercel env pull .env.local
npx prisma generate
npx prisma db push
```

### Option B : Via l'interface Vercel

1. Allez dans **Storage** → **Postgres** → **Query**
2. Copiez le contenu du schéma SQL généré par Prisma
3. Exécutez-le dans l'éditeur de requêtes

## Étape 8 : Tester l'Application

1. Ouvrez votre URL Vercel : `https://votre-app.vercel.app`
2. Créez un compte
3. Uploadez une photo avec GPS
4. Vérifiez que tout fonctionne !

## 🎉 C'est Déployé !

Votre application est maintenant en ligne et accessible partout dans le monde !

## Déploiements Automatiques

Chaque fois que vous pushez sur la branche principale, Vercel déploiera automatiquement les changements.

## Domaine Personnalisé (Optionnel)

1. Allez dans **Settings** → **Domains**
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions pour configurer les DNS

## Monitoring et Logs

- **Logs** : Vercel Dashboard → votre projet → **Logs**
- **Analytics** : Vercel Dashboard → votre projet → **Analytics**
- **Database** : Vercel Dashboard → **Storage** → **Postgres**

## Troubleshooting

### Build Failed

- Vérifiez les logs dans Vercel
- Assurez-vous que toutes les dépendances sont dans `package.json`
- Vérifiez que `DATABASE_URL` et `DIRECT_URL` sont configurés

### Database Connection Error

- Vérifiez que les variables d'environnement sont correctes
- Assurez-vous d'avoir exécuté `prisma db push`
- Vérifiez les logs de la base de données dans Vercel

### Upload Failed

- Vérifiez que `BLOB_READ_WRITE_TOKEN` est configuré
- Vérifiez les logs pour voir les erreurs spécifiques

## Coûts

### Niveau Gratuit Vercel (Hobby)

- ✅ Hosting : Gratuit
- ✅ Postgres : 256 MB gratuits
- ✅ Blob Storage : 1 GB gratuit
- ✅ Bandwidth : 100 GB/mois

C'est largement suffisant pour démarrer !

### Si vous dépassez le niveau gratuit

Vercel offre un plan Pro à $20/mois avec :
- Postgres illimité
- 100 GB de Blob Storage
- Bandwidth illimité

## Support

- Documentation Vercel : https://vercel.com/docs
- Documentation Next.js : https://nextjs.org/docs
- Documentation Prisma : https://www.prisma.io/docs

---

**Bon déploiement ! 🚀**
