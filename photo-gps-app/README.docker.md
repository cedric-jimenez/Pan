# Docker Development Setup

Configuration Docker Compose pour le développement local de l'application Photo GPS.

## 🚀 Démarrage rapide

### Prérequis
- Docker et Docker Compose installés
- Port 3000 et 5432 disponibles

### Lancer l'application

```bash
# Démarrer tous les services
docker compose up

# Ou en arrière-plan
docker compose up -d
```

L'application sera accessible sur **http://localhost:3000**

### Arrêter l'application

```bash
# Arrêter les services
docker compose down

# Arrêter et supprimer les volumes (⚠️ supprime la base de données)
docker compose down -v
```

## 📦 Services

### PostgreSQL (postgres)
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Database**: photogps
- **User**: photouser
- **Password**: photopass
- **Volume**: `postgres_data` (données persistantes)

### Next.js App (app)
- **Port**: 3000
- **Hot reload**: ✅ (grâce au volume monté)
- **Volume uploads**: `uploads` (photos persistantes)

## 🔧 Commandes utiles

### Voir les logs
```bash
# Tous les services
docker compose logs -f

# Service spécifique
docker compose logs -f app
docker compose logs -f postgres
```

### Reconstruire les images
```bash
docker compose build

# Sans cache
docker compose build --no-cache
```

### Accéder à la base de données
```bash
# Avec psql
docker compose exec postgres psql -U photouser -d photogps

# Ou avec un client externe
# Host: localhost
# Port: 5432
# Database: photogps
# User: photouser
# Password: photopass
```

### Exécuter des commandes dans le conteneur
```bash
# Prisma Studio
docker compose exec app npx prisma studio

# Migrations Prisma
docker compose exec app npx prisma db push

# Shell dans le conteneur
docker compose exec app sh
```

### Réinitialiser la base de données
```bash
# Supprimer et recréer
docker compose down -v
docker compose up -d
```

## 📝 Développement

### Modifier le code
Les modifications de code sont automatiquement détectées grâce au volume monté :
```yaml
volumes:
  - .:/app  # Code source synchronisé
```

### Ajouter des dépendances
```bash
# Installer une nouvelle dépendance
docker compose exec app yarn add <package>

# Reconstruire l'image après
docker compose build app
```

### Variables d'environnement
Les variables sont définies dans `docker-compose.yml`. Pour les modifier :

1. Éditez `docker-compose.yml`
2. Redémarrez les services : `docker compose restart`

## 🗂️ Volumes

### postgres_data
Contient les données PostgreSQL. Persistant entre les redémarrages.

### uploads
Contient les photos uploadées. En développement local, on utilise le système de fichiers au lieu de Vercel Blob.

## 🐛 Dépannage

### Port déjà utilisé
```bash
# Vérifier les ports utilisés
lsof -i :3000
lsof -i :5432

# Changer les ports dans docker-compose.yml si nécessaire
```

### Problèmes de permissions
```bash
# Sur Linux, si problèmes avec les volumes
sudo chown -R $USER:$USER .
```

### Reconstruire complètement
```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Prisma Client non généré
```bash
docker compose exec app npx prisma generate
docker compose restart app
```

## 🔐 Sécurité

⚠️ **Important** : Les identifiants par défaut sont pour le développement local uniquement !

Pour la production, utilisez :
- Des mots de passe forts
- Des secrets aléatoires pour NEXTAUTH_SECRET
- Vercel Postgres et Blob Storage

## 📚 Différences avec la production

| Aspect | Docker Local | Vercel Production |
|--------|-------------|-------------------|
| Base de données | PostgreSQL local | Vercel Postgres |
| Stockage photos | Filesystem local | Vercel Blob Storage |
| URL | http://localhost:3000 | https://pan-azure.vercel.app |
| SSL/TLS | ❌ | ✅ |
| Hot reload | ✅ | ❌ |

## ✅ Workflow recommandé

1. **Développer localement avec Docker**
   ```bash
   docker compose up
   ```

2. **Tester les changements**
   - L'app se recharge automatiquement
   - Les photos sont stockées localement

3. **Commiter et pousser**
   ```bash
   git add .
   git commit -m "..."
   git push
   ```

4. **Vercel déploie automatiquement**
   - Build sur Vercel
   - Utilise Postgres et Blob Storage cloud
