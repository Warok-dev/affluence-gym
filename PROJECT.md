# Affluence Gym — Spécification du projet

> Document destiné à l'agent de développement. Lis-le en entier avant de coder.
> Langue de l'interface utilisateur : **français** (prévoir l'anglais ensuite). Code et commentaires : anglais ou français, mais cohérent.

## 1. Vision

Application web mobile (PWA) qui indique **en temps réel l'affluence dans les centres de conditionnement physique (gyms) d'une université**, pour que les étudiants choisissent le meilleur moment pour s'entraîner. Inspirée des applis de salles privées qui affichent le nombre de personnes présentes grâce au scan de carte à l'entrée.

Deux salles au départ : `minto` et `montpetit`.

L'auteur est étudiant en génie informatique et vise un poste d'ingénieur en déploiement IA/ML. Le projet doit donc démontrer de bonnes pratiques : tests, Docker, CI/CD, architecture propre, et une composante IA (prévision) en dernière phase.

## 2. Contraintes importantes

- **Aucune donnée personnelle.** Pas de compte, pas d'e-mail, pas de nom. Les utilisateurs sont identifiés par un `client_id` anonyme (UUID généré côté client et stocké dans le navigateur).
- **Aucun accès au système de cartes de l'université** pour l'instant. Source de données initiale = **signalements participatifs** des utilisateurs. L'architecture doit permettre d'ajouter plus tard une **source officielle** (compteur agrégé entrées/sorties fourni par l'université) sans tout réécrire.
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

Phases 1 à 4 faites. Backend : 23 tests (exécutés sur SQLite et PostgreSQL en CI) ; frontend : 22 tests.

```
affluence-gym/
├── .gitignore, .gitattributes, .env.example
├── PROJECT.md
├── README.md
├── docker-compose.yml      # PostgreSQL + API + PWA (nginx)
├── render.yaml             # déploiement Render (blueprint)
├── .github/workflows/ci.yml
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
│   │   └── snapshot.py     # `python -m app.snapshot` (pour un cron externe)
│   ├── scripts/seed_demo.py  # données FICTIVES dans demo.db
│   └── tests/ (conftest.py, test_api.py, test_history.py, test_db.py)
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

### Phase 5 — IA : prévision d'affluence
- Modèle simple de prévision (baseline : moyenne par heure et jour ; puis gradient boosting ou similaire) à partir de l'historique accumulé.
- Variables possibles : jour de la semaine, heure, période d'examens, jours fériés, météo.
- Endpoint `GET /forecast/{facility}` et affichage « le gym sera probablement calme à 18 h ».
- Service de prédiction déployable séparément ou en module, avec évaluation hors ligne documentée.

### Idées futures (hors périmètre actuel)
Notifications (« le gym se vide »), signalement de l'état des équipements, partenaires d'entraînement, suivi d'entraînements. Ne pas les implémenter sans demande explicite.

## 7. Anti-abus et robustesse

- Le `client_id` anonyme se contourne facilement. Pour le prototype c'est accepté.
- Pistes d'amélioration futures : limitation de débit par IP (rate limiting), pondération des signalements, détection de valeurs aberrantes, éventuellement un code visible uniquement sur place.
- Valider toutes les entrées (déjà fait avec Pydantic). Configurer CORS pour n'autoriser que l'origine du frontend.

## 8. Intégration future d'une source officielle

Prévoir une abstraction `OccupancySource` avec au moins deux implémentations : `CrowdSource` (signalements) et `OfficialCounterSource` (compteur agrégé fourni par l'université, par exemple via un endpoint ou un webhook qui envoie « entrées moins sorties »). L'API publique ne doit pas changer ; seul `level`/`label` peut être remplacé par un **nombre de personnes** quand la source officielle existe.

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
