# Affluence Gym — Spécification du projet

> Document destiné à l'agent de développement. Lis-le en entier avant de coder.
> Langue de l'interface utilisateur : **français** (prévoir l'anglais ensuite). Code et commentaires : anglais ou français, mais cohérent.

## 1. Vision

Application web mobile (PWA) qui indique **en temps réel l'affluence dans les centres de conditionnement physique (gyms) d'une université**, pour que les étudiants choisissent le meilleur moment pour s'entraîner. Inspirée des applis de salles privées qui affichent le nombre de personnes présentes grâce au scan de carte à l'entrée.

Deux salles au départ : `minto` et `montpetit`.

**Objectif principal (précisé le 2026-10-02) : afficher le nombre exact de personnes présentes.** À l'entrée, chaque étudiant scanne sa carte (le tourniquet ne s'ouvre qu'au scan) ; la sortie se fait par un tourniquet libre, sans scan (on ignore s'il compte les passages). Présents = entrées − sorties, à partir de **compteurs agrégés fournis par l'université**. Les signalements participatifs restent la solution de repli. Une rencontre avec le service des sports est prévue, démo à l'appui (voir `docs/integration-compteurs.md`).

**Élargissement (2026-10-02) : appli gym complète** : suivi d'entraînements, exercices et programmes, état des équipements, notifications. Les données personnelles (séances) restent **sur le téléphone** (décision de l'auteur), jamais sur le serveur.

L'auteur est étudiant en génie informatique et vise un poste d'ingénieur en déploiement IA/ML. Le projet doit donc démontrer de bonnes pratiques : tests, Docker, CI/CD, architecture propre, et une composante IA (prévision) en dernière phase.

## 2. Contraintes importantes

- **Aucune donnée personnelle.** Pas de compte, pas d'e-mail, pas de nom. Les utilisateurs sont identifiés par un `client_id` anonyme (UUID généré côté client et stocké dans le navigateur).
- **Aucun accès au système de cartes de l'université** sans leur accord. La source officielle (compteur agrégé entrées/sorties) est prête côté code et n'attend que leur feu vert ; en attendant, **signalements participatifs**. On ne demande jamais d'identité : seulement deux totaux.
- **Séances et progrès : stockés uniquement sur l'appareil** (pas de compte), avec export/import d'une sauvegarde.
- **Pas de logo ni de nom officiel de l'université** dans l'interface (l'appli n'est pas officielle tant qu'elle n'est pas approuvée).
- Ne jamais scraper ni contourner un système de l'université.
- Budget quasi nul : hébergement gratuit ou très peu cher.

## 3. Stack technique

| Couche | Choix |
|---|---|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Base de données | SQLite (dev), PostgreSQL (prod) via SQLAlchemy, migrations avec Alembic |
| Frontend | PWA en React (Vite), installable sur téléphone, mobile-first |
| Tests | pytest + httpx (backend), Vitest (frontend) |
| Conteneurs | Docker + docker-compose |
| CI/CD | GitHub Actions (lint, tests, build d'image) |
| Hébergement cible | Render, Fly.io ou Railway |

## 4. État actuel du code (déjà fait)

Phases 1 à 5 faites. Backend : 36 tests (exécutés sur SQLite et PostgreSQL en CI) ; frontend : 25 tests.

```
affluence-gym/
├── .gitignore, .gitattributes, .env.example
├── PROJECT.md
├── README.md
├── docker-compose.yml      # PostgreSQL + API + PWA (nginx)
├── render.yaml             # déploiement Render (blueprint)
├── .github/workflows/ci.yml
├── docs/forecast-evaluation.md
├── backend/
│   ├── Dockerfile, .dockerignore
│   ├── requirements.txt (exécution), requirements-dev.txt (tests, lint)
│   ├── pyproject.toml      # config ruff et pytest
│   ├── alembic.ini, migrations/   # Alembic (révision 0001_initial)
│   ├── app/
│   │   ├── main.py         # création de l'app, CORS, tâche périodique (lifespan)
│   │   ├── config.py       # variables d'environnement
│   │   ├── db.py           # SQLAlchemy : modèles Report, OccupancySnapshot
│   │   ├── facilities.py   # salles et horaires d'ouverture (statiques)
│   │   ├── sources.py      # OccupancySource / CrowdSource (§8)
│   │   ├── history.py      # snapshots, historique, profil par heure
│   │   ├── routes.py       # endpoints
│   │   ├── scheduler.py    # boucle des snapshots toutes les 15 min
│   │   ├── snapshot.py     # `python -m app.snapshot` (pour un cron externe)
│   │   └── forecast/       # features, models (baseline, gbm), service, evaluate
│   ├── scripts/seed_demo.py  # données FICTIVES dans demo.db
│   └── tests/ (conftest.py, test_api.py, test_history.py, test_db.py, test_forecast.py)
└── frontend/               # PWA React + Vite + TypeScript
    ├── Dockerfile, nginx.conf.template   # build Node, puis nginx (proxy /api)
    ├── index.html
    ├── vite.config.ts      # PWA (vite-plugin-pwa), proxy /api, config Vitest
    ├── public/             # icônes PWA, favicon
    ├── scripts/generate-icons.mjs
    └── src/
        ├── App.tsx, main.tsx, api.ts, config.ts, clientId.ts, time.ts, styles.css
        ├── components/ (FacilityCard.tsx, TypicalDay.tsx)
        ├── i18n/ (fr.ts, en.ts, index.tsx)
        └── __tests__/
```

Comportement actuel de l'API :

- `POST /reports` : body `{facility, level (1-4), client_id}`. Renvoie 201. Renvoie 404 si salle inconnue, 422 si `level` hors 1-4, **429 si le même `client_id` a déjà signalé la même salle dans les 15 dernières minutes**.
- `GET /occupancy/{facility}` : moyenne arrondie des signalements des **30 dernières minutes**. Renvoie `{facility, level, label, reports, last_report_ts}`. Si aucun signalement : `level: null`, `label: "Pas de données"`, `last_report_ts: null`.
- `GET /health` : `{"status": "ok"}`.
- `GET /history/{facility}?days=N` (1-90, défaut 7) : `{facility, days, points: [{ts, level, source}]}`.
- `GET /profile/{facility}?weekday=0-6&weeks=N` (défaut : aujourd'hui, 8 semaines) : `{facility, weekday, weeks, timezone, opening_hours: {open, close} | null, hours: [{hour, level, samples, calm}]}`. Les heures sont en heure locale (`TIMEZONE`) et limitées aux horaires d'ouverture.
- Niveaux : 1 = Vide, 2 = Calme, 3 = Modéré, 4 = Bondé.
- CORS : origines autorisées via `ALLOWED_ORIGINS` (par défaut le serveur de dev Vite).

À conserver : le contrat d'API ci-dessus (le frontend en dépend). Tu peux refactorer l'interne (SQLAlchemy, découpage en modules) tant que les tests existants continuent de passer.

### Décisions prises (phase 2)

- `last_report_ts` ajouté à `GET /occupancy` comme champ **additif** pour afficher « il y a X min » (option choisie face à l'alternative « heure du dernier rafraîchissement côté client »).
- PWA via **vite-plugin-pwa** (Workbox, `autoUpdate`) plutôt qu'un service worker écrit à la main. Les appels `/api` ne sont jamais servis depuis le cache.
- i18n : **mini-dictionnaire maison** (`src/i18n`, hook `useT()`), sans dépendance. Le libellé du niveau est traduit côté client à partir de `level` ; le `label` du backend est ignoré par l'UI.
- Le frontend appelle `/api/...`, redirigé par le proxy Vite vers le backend (même origine, donc ça marche aussi depuis un téléphone sur le réseau local). CORS reste activé pour un appel direct (`VITE_API_URL`).
- Rafraîchissement toutes les 45 s, et dès que l'appli revient au premier plan.
- `client_id` : `crypto.randomUUID()` avec un repli sur `getRandomValues` (nécessaire en HTTP sur réseau local), et un repli en mémoire si le `localStorage` est bloqué.

- HTTPS sur téléphone en dev : **quick tunnel Cloudflare** (`cloudflared tunnel --url http://localhost:4173`), sans compte ni changement de code. Vite autorise `*.trycloudflare.com`. Écarté : certificat auto-signé (Android refuse le service worker) et déploiement anticipé (c'est la phase 4).
- Pas de bouton FR/EN pour l'instant : les dictionnaires sont prêts, le sélecteur viendra quand le contenu anglais sera relu.

### Décisions prises (phase 3)

- **SQLAlchemy 2 dès maintenant** (modèles typés), avec un découpage en modules. La nouvelle table l'imposait et ça prépare PostgreSQL (`DATABASE_URL`). Les tables sont créées avec `create_all` ; **Alembic arrive en phase 4**, avec une migration initiale (`alembic stamp` pour les bases existantes).
- **Tâche périodique dans le processus API** (boucle asyncio dans le `lifespan`, calée sur les quarts d'heure). On peut la désactiver avec `SNAPSHOT_ENABLED=false` et la remplacer par un cron externe qui lance `python -m app.snapshot`. Les snapshots sont **idempotents** grâce à la contrainte unique `(facility, ts, source)` : aucun doublon, même avec plusieurs workers. Écarté : APScheduler/Celery, une dépendance de trop pour un seul job.
- **Pas de snapshot quand il n'y a aucun signalement** : « personne n'a signalé » ne veut pas dire « vide », et ça fausserait les moyennes.
- **Abstraction `OccupancySource`** (§8) introduite : `CrowdSource` aujourd'hui. Le snapshot enregistre `source.name`.
- **Profil calculé en Python** à partir des snapshots des N dernières semaines, en heure locale `America/Toronto` (`TIMEZONE`, avec le paquet `tzdata` pour Windows). C'est plus portable que des fonctions de date SQL propres à SQLite ou PostgreSQL, et le volume reste faible (environ 5 000 lignes par salle sur 8 semaines).
- **Créneau calme** : moyenne ≤ 2 (« Calme ») sur au moins 2 relevés, défini côté backend (`calm`) pour que la règle soit testée en un seul endroit.
- **Horaires d'ouverture** dans `app/facilities.py`, renvoyés par `/profile`. Les valeurs actuelles sont des **valeurs provisoires à vérifier** (6 h 30-23 h en semaine, 8 h-20 h le week-end).
- **Graphique sans bibliothèque** (barres en CSS) : une seule série, créneaux calmes en vert et autres heures en gris. Un tap ou un survol détaille l'heure choisie, et un tableau masqué sert aux lecteurs d'écran. L'heure de la salle est calculée dans son fuseau, même si le téléphone est ailleurs.
- **Données de démo** : `scripts/seed_demo.py` écrit uniquement dans `demo.db`, jamais dans la vraie base.

### Décisions prises (phase 4)

- **Hébergement : Render + Neon.**
  - L'API est un *web service* Docker gratuit, et la PWA un *static site* gratuit (CDN, HTTPS).
  - PostgreSQL vient de **Neon** (offre gratuite permanente) : la base gratuite de Render expire après 30 jours, ce qui ferait perdre l'historique.
  - Écartés : Fly.io et Railway, plus d'offre gratuite durable.
- **Déploiement automatisé avec `autoDeployTrigger: checksPass`** : Render redéploie `main` seulement si la CI GitHub est verte. Il n'y a donc aucun secret de déploiement à stocker dans GitHub.
- **En production, le frontend appelle l'API par son URL publique** (`VITE_API_URL`), avec CORS limité au site. Écarté : la réécriture `/api/*` de Render vers une URL externe, peu documentée (POST, en-têtes). En dev (Vite) et en Docker (nginx), `/api` reste en même origine.
- **Migrations Alembic appliquées au démarrage de l'API.** C'est simple et sûr avec une seule instance. Les bases antérieures à Alembic sont complétées puis marquées `0001`. Si on passe un jour à plusieurs instances, il faudra une étape `alembic upgrade head` séparée avant le démarrage.
- **psycopg 3** (paquet binaire), `pool_pre_ping` pour les connexions coupées par Neon quand il se met en veille, et `ts` en `BigInteger`.
- **CI** :
  - lint ruff ;
  - tests backend en matrice **SQLite + PostgreSQL 17** ;
  - `alembic check` ;
  - tests et build frontend ;
  - construction des images, puis **test de bout en bout de la stack compose via nginx**.
  - Les images ne sont pas publiées dans un registre : Render construit lui-même l'image depuis le repo.
- **Images** : l'API tourne sur `python:3.12-slim` avec un utilisateur non root et un `HEALTHCHECK` sur `/health`. Le frontend est construit en deux étapes (Node, puis `nginx:alpine`) ; `sw.js` et `index.html` n'y sont jamais mis en cache.
- **Limites acceptées de l'offre gratuite** : l'API se met en veille après 15 min sans trafic (premier appel lent), et aucun snapshot n'est pris pendant la veille. Comme l'appli ouverte interroge l'API toutes les 45 s, ça ne touche que les périodes sans utilisateurs.

### Décisions prises (phase 5)

- **Module `app/forecast/` indépendant de FastAPI** (variables, modèles, service, évaluation). L'API ne fait que l'appeler. Le module peut être extrait en service séparé sans réécriture.
- **Réentraînement en mémoire une fois par jour**, sans fichier de modèle : l'hébergement gratuit n'a pas de disque persistant, et l'entraînement prend moins d'une seconde pour environ 14 000 snapshots. Il est lancé par la tâche des quarts d'heure, ou au premier appel de `/forecast`.
- **Sélection automatique du modèle** :
  - la validation porte sur les 14 derniers jours (découpage temporel, jamais mélangé) ;
  - le modèle à la plus petite MAE est réentraîné sur toutes les données ;
  - le `gbm` n'est candidat qu'à partir de 500 snapshots.
  - Le choix est exposé dans `/forecast` (`model`, `validation_mae`).
- **Modèles** :
  - la baseline (moyenne par salle, jour et heure, avec replis) ;
  - `HistGradientBoostingRegressor` (scikit-learn), choisi plutôt que LightGBM ou XGBoost : pas de dépendance native de plus, et il gère nativement les variables catégorielles.
- **Variables** :
  - jour, heure, avec un encodage cyclique de l'heure ;
  - week-end ;
  - jours fériés de l'Ontario (bibliothèque `holidays`) ;
  - périodes d'examens (configuration statique, **provisoire**).
- **Météo écartée pour la v1** : il faudrait une source externe pour l'historique et pour les prévisions. Son ajout est documenté, et sera à valider par backtest.
- **Évaluation hors ligne** : backtest à origine glissante (4 semaines), avec MAE, RMSE, exactitude du niveau et F1 « calme ». La commande est en **lecture seule**, donc sans danger sur une copie de la prod. Les résultats sur données de démo, **synthétiques**, sont dans `docs/forecast-evaluation.md`.
- **Interface** : « Prévision : probablement calme vers 18 h », ou l'heure la moins chargée s'il n'y a pas de créneau calme. Si la prévision est indisponible, l'appli revient aux créneaux calmes de l'historique.

## 5. Modèle de données

Table `reports` : `id`, `facility`, `level`, `client_id`, `ts` (epoch secondes).

Table `occupancy_snapshots` (phase 3) (`facility`, `ts` arrondi au quart d'heure, `level`, `source`) alimentée par une tâche périodique, pour l'historique et le futur modèle de prévision. Contrainte unique `(facility, ts, source)`. Le champ `source` vaut `crowd` aujourd'hui, `official` plus tard.

## 6. Fonctionnalités par phases

### Phase 1 — Fondations (fait en grande partie)
- API de signalement et de lecture de l'affluence.
- Anti-abus par cooldown sur `client_id`.
- Tests unitaires.

### Phase 2 — Interface mobile (PWA)
- Page d'accueil : une carte par salle avec le niveau actuel (couleur + libellé + nombre de signalements récents + « il y a X min »).
- Bouton « Signaler l'affluence » : choix en 1 tap parmi 4 niveaux, retour visuel de succès, message clair si l'erreur 429.
- Génération du `client_id` (UUID) au premier lancement, stocké en `localStorage`.
- Rafraîchissement automatique toutes les 30–60 s.
- PWA : manifeste, icônes, service worker, installable. Mode sombre. Accessibilité de base (contrastes, libellés, tailles de cibles tactiles).
- UI en français ; prévoir i18n (fr/en).

### Phase 3 — Historique et « meilleur moment pour y aller » (fait)
- Tâche périodique (toutes les 15 min) qui enregistre un snapshot par salle.
- Endpoint `GET /history/{facility}?days=N` et endpoint de profil moyen par jour de semaine et heure.
- Graphique dans l'UI : affluence typique par heure pour le jour courant, avec mise en évidence des créneaux calmes.
- Horaires d'ouverture des salles (données statiques configurables).

### Phase 4 — Déploiement (fait ; mise en ligne : créer les comptes Render et Neon, voir README)
- Dockerfile backend et frontend, `docker-compose.yml` pour le dev local.
- Passage à PostgreSQL en prod via variable d'environnement `DATABASE_URL`.
- CI GitHub Actions : lint (ruff), tests backend, tests frontend, build des images.
- Déploiement automatisé sur l'hébergeur choisi. Variables d'environnement documentées (`.env.example`).
- Endpoint `/health` utilisé pour les health checks.

### Phase 5 — IA : prévision d'affluence (fait ; à réévaluer avec de vraies données)
- Modèle simple de prévision (baseline : moyenne par heure et jour ; puis gradient boosting ou similaire) à partir de l'historique accumulé.
- Variables possibles : jour de la semaine, heure, période d'examens, jours fériés, météo.
- Endpoint `GET /forecast/{facility}` et affichage « le gym sera probablement calme à 18 h ».
- Service de prédiction déployable séparément ou en module, avec évaluation hors ligne documentée.

### Compteur officiel (fait, branche `official-counter`)
- `POST /official/{facility}/counts` (clé `X-Api-Key`), compteurs cumulés depuis minuit ; table `official_counts` (migration 0002).
- `OfficialCounterSource` : présents = entrées − sorties, ou estimation (entrées des 75 dernières minutes) sans compteur de sortie ; capacité par salle (provisoire : 120) ; niveau = taux d'occupation (< 25 / 50 / 75 %).
- `PreferOfficialSource` : compteur s'il est frais (< 10 min), sinon signalements. `GET /occupancy` ajoute `source`, `people`, `capacity`, `estimated`, `updated_ts` (additifs).
- Simulateur `scripts/simulate_counter.py` (données fictives, même canal sécurisé) pour la démo ; document pour l'université `docs/integration-compteurs.md`.

### Phase 6 — Structure et suivi d'entraînements (fait, branche `phase-6-workouts`)
- Barre d'onglets (Affluence · Séances ; Exercices et Salles arriveront avec les phases 7 et 8), routage par l'adresse (`#/seances`, `#/seances/en-cours`, `#/seances/<id>`), sans dépendance.
- Séance en cours : chronomètre, exercices (catalogue de 33 exercices, recherche sans accents), séries répétitions × charge, « Dernière fois » et préremplissage, minuteur de repos (vibration à la fin), confirmations en ligne (pas de modale).
- Historique, détail, suppression ; records (meilleur set par 1RM estimé, formule d'Epley) ; séances de la semaine.
- Réglages : unité kg/lb (charges stockées en kg, 45 lb reste 45 lb), repos par défaut.
- **Stockage uniquement sur l'appareil** : `localStorage` derrière une petite interface (`workouts/store.ts`), remplaçable par IndexedDB plus tard sans toucher aux écrans. Choisi plutôt qu'IndexedDB pour la simplicité et la testabilité ; le volume reste faible (environ 3 Ko par séance). Sauvegarde export/import JSON validée à l'import, fusion sans doublons, message clair si le stockage est plein ou bloqué.
- Toutes les modifications de séance sont des mises à jour fonctionnelles : plusieurs taps rapides ne s'écrasent jamais (bug trouvé et corrigé pendant la vérification, test dédié).

### Phase 7 — Exercices et programmes (fait, branche `phase-7-programs`)
- Onglet « Exercices » : bibliothèque de 33 exercices filtrable par groupe et par recherche ; fiche (muscles, matériel, 3 à 4 étapes, l'erreur à éviter, rappel de prudence), ton record et tes 5 dernières séances, « Ajouter à la séance en cours ».
- 4 programmes (débutant corps entier, force 5 × 5, haut/bas 4 jours, poids du corps) ; chaque jour se lance en un tap, séries préremplies avec les dernières charges ; impossible de lancer par-dessus une séance en cours.
- Textes originaux (`workouts/guide.ts`, `workouts/programs.ts`), aucune image ; test d'intégrité : chaque exercice a sa fiche, chaque programme ne cite que des exercices existants.
- Accessibilité : les champs de séries portent le nom de l'exercice (« Squat · Série 2 · Charge »), pour rester uniques avec plusieurs exercices.

### Phase 8 — État des équipements (fait, branche `phase-8-equipment`)
- `GET /equipment/{salle}` (chaque machine : `status` broken/ok/unknown, `since_ts`, `reports`) et `POST /equipment/{salle}/{machine}/reports` (`{status, client_id}` ; 404 machine inconnue, 422, 429 si la même personne a signalé la même machine il y a moins de 30 min). Table `equipment_reports` (migration 0003).
- Règle : l'état d'une machine est le signalement le plus récent des 7 derniers jours, sinon « non signalé ».
- Liste des machines **provisoire** (`backend/app/equipment.py`), à remplacer par la liste réelle du service des sports.
- Onglet « Matériel » : onglets par salle, résumé des pannes, machines par catégorie, signalement en un tap, tampon « En panne » (le rouge reste réservé à « maintenant », l'ambre au meilleur choix).

### Phase 9 — Notifications (fait, branche `phase-9-notifications`)
- **Alerte ponctuelle** « M'avertir quand <salle> sera calme » (panneau « Quand y aller »), valable jusqu'à la fermeture du jour. Le serveur vérifie toutes les 2 min (même source : compteur officiel ou signalements) ; au niveau Calme ou Vide, il envoie **une** notification Web Push puis **efface l'abonnement**. Alertes expirées effacées aussi.
- Écarté : abonnements permanents et rappels quotidiens (spam, et l'abonnement resterait stocké indéfiniment).
- `GET /notifications/config`, `POST /alerts` (409 si la salle est fermée), `DELETE /alerts/{id}` (jeton propre à l'appareil). Table `alerts` (migration 0004). Clés VAPID par variables d'environnement ; sans elles, la fonction est désactivée et invisible.
- Service worker : `public/push-sw.js` importé par Workbox (affiche la notification, ouvre l'appli au clic). iPhone : seulement si l'appli est installée sur l'écran d'accueil (message dans l'interface).

### Phase 10 — Mode écran pour l'entrée de la salle (fait, branche `phase-10-ecran`)
- Route `#/ecran` : le tableau d'affluence en plein écran, lisible de loin, pour une télé à l'entrée (argument pour le service des sports : l'écran existe déjà au comptoir). Pas d'en-tête, d'onglets ni de bouton de signalement ; rafraîchi toutes les 30 s ; garde l'écran allumé (Screen Wake Lock, si le navigateur l'accepte) ; garde les derniers chiffres et le dit si la connexion tombe.
- Code QR vers l'appli, généré dans la page (bibliothèque `qrcode-generator` intégrée au build, aucun service externe). Adresse = celle de la page, ou `VITE_PUBLIC_URL` si la télé utilise une autre adresse.
- Même règle « Plus calme » que l'appli (`quieterIndex` dans `levels.ts`, partagée).
- Lien discret « Mode écran » dans le pied de page de l'écran d'affluence.

### Idées futures (hors périmètre actuel)
Partenaires d'entraînement (impliquerait des comptes, à rediscuter).

## 7. Anti-abus et robustesse

- Le `client_id` anonyme se contourne facilement. Pour le prototype c'est accepté.
- Pistes d'amélioration futures : limitation de débit par IP (rate limiting), pondération des signalements, détection de valeurs aberrantes, éventuellement un code visible uniquement sur place.
- Valider toutes les entrées (déjà fait avec Pydantic). Configurer CORS pour n'autoriser que l'origine du frontend.

## 8. Source officielle (implémentée, en attente de l'accord de l'université)

`OccupancySource` a trois implémentations : `CrowdSource` (signalements), `OfficialCounterSource` (compteurs des tourniquets envoyés par l'université) et `PreferOfficialSource` (la seconde si fraîche, sinon la première). L'API publique est inchangée ; `/occupancy` ajoute le **nombre de personnes** et la capacité. Ce qu'on demande à l'université, les modes de transmission et les garanties de vie privée sont dans `docs/integration-compteurs.md`.

## 9. Qualité attendue

- Tests automatisés pour chaque endpoint et chaque règle métier (cooldown, fenêtre de 30 min, validation).
- Code typé, formaté (ruff/black), structuré en modules (routes, services, modèles).
- `README.md` clair : installation, lancement, tests, déploiement.
- Commits petits et messages explicites ; une branche par phase.

## 10. Définition de « terminé » pour la phase 2 (faite)

- [x] Je peux ouvrir l'appli sur mon téléphone et voir le niveau des deux salles. *(vérifié en vue mobile 375 px ; à confirmer sur un vrai téléphone)*
- [x] Je peux signaler un niveau en un tap ; un second signalement immédiat affiche un message d'attente.
- [x] L'appli est installable (PWA) et fonctionne en mode sombre. *(installable sur ordinateur via localhost ; sur téléphone via le tunnel HTTPS décrit dans le README)*
- [x] Les tests backend passent toujours et des tests frontend couvrent l'affichage et le signalement.

## 11. Consignes à l'agent

1. Avant de modifier quoi que ce soit, lance `pytest` dans `backend/` pour confirmer que l'état de départ est vert.
2. Travaille phase par phase et ne passe pas à la suivante sans mon accord.
3. Ne rajoute aucune donnée personnelle ni service tiers de suivi (analytics) sans me demander.
4. Si une décision d'architecture n'est pas couverte ici, propose 2 options avec leurs compromis plutôt que de choisir silencieusement.
5. À la fin de chaque phase, résume ce qui a été fait, ce qui reste, et comment le tester.
