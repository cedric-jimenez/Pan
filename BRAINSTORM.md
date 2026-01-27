# Brainstorm - Fonctionnalités à développer

## 1. Identification automatique des individus (haute priorité)

Actuellement, l'assignation des photos aux individus est manuelle. Avec les embeddings DINOv2 déjà générés, on pourrait :

- **Suggestion automatique d'individu** : à l'upload, comparer l'embedding de la nouvelle photo avec ceux des individus existants et proposer les meilleurs matchs
- **Clustering automatique** : regrouper les photos non assignées par similarité visuelle pour faciliter la création de nouveaux individus
- **Score de confiance** : afficher un pourcentage de certitude pour chaque suggestion

## 2. Statistiques et tableaux de bord

- **Dashboard analytique** : nombre d'individus identifiés, nombre de photos par espèce, évolution temporelle des observations
- **Graphiques de capture-recapture** : visualiser les re-observations d'individus dans le temps
- **Carte de chaleur des observations** : densité d'observations par zone géographique (déjà un heatmap basique, mais l'enrichir)
- **Export de données** : CSV/Excel des observations pour analyse scientifique externe

## 3. Gestion multi-espèces

Le système est centré sur les salamandres. L'étendre à d'autres espèces serait utile :

- **Modèle d'espèce** : ajouter une entité "Species" en base
- **Classification automatique** : utiliser le modèle YOLO pour détecter différentes espèces d'amphibiens
- **Filtres par espèce** dans la galerie et la carte

## 4. Fonctionnalités collaboratives

- **Multi-utilisateurs sur un projet** : permettre à plusieurs chercheurs de travailler sur le même jeu de données
- **Rôles et permissions** : admin, contributeur, lecteur
- **Commentaires sur les photos** : discussion entre chercheurs sur une observation
- **Journal d'activité** : historique des actions (upload, assignation, modification)

## 5. Améliorations de la carte

- **Trajets d'individus** : tracer le parcours d'un individu sur la carte à partir de ses observations géolocalisées
- **Filtres avancés** : par individu, par période, par espèce
- **Zones d'étude** : définir des polygones représentant des sites d'étude
- **Import/export GeoJSON/KML** : interopérabilité avec les outils SIG

## 6. Mode terrain (PWA / offline)

- **Progressive Web App** : installer l'app sur mobile pour une utilisation sur le terrain
- **Mode hors-ligne** : capturer des photos et les synchroniser plus tard quand le réseau est disponible
- **Géolocalisation en temps réel** : utiliser le GPS du téléphone pour taguer les photos automatiquement

## 7. Qualité des données

- **Validation des photos** : système de revue où un second chercheur confirme l'identification
- **Détection de doublons** : alerter si une photo très similaire existe déjà
- **Score de qualité** : évaluer automatiquement la qualité de l'image (netteté, éclairage) pour prioriser les meilleures photos par individu

## 8. Intégrations externes

- **iNaturalist** : synchroniser les observations avec la plateforme citoyenne
- **GBIF** : exporter les données au format Darwin Core pour contribuer aux bases de données mondiales de biodiversité
- **Météo** : enrichir les observations avec les conditions météo au moment de la capture (API météo)

## 9. Améliorations UX

- **Vue chronologique (timeline)** : afficher les observations d'un individu sur une frise chronologique
- **Comparaison côte à côte** : comparer visuellement deux photos/individus
- **Raccourcis clavier** : navigation rapide dans la galerie (flèches, assignation rapide)
- **Tags et annotations** : ajouter des tags libres aux photos (habitat, comportement, stade de vie)
- **Mode plein écran** pour la galerie

## 10. Notifications et alertes

- **Alerte nouvelle observation** : notifier quand un individu est re-observé après une longue absence
- **Rappels de terrain** : planifier des sessions de terrain et recevoir des rappels
- **Résumé périodique** : email hebdomadaire avec les statistiques clés
