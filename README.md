# Affluence Gym

[![CI](https://github.com/Warok-dev/affluence-gym/actions/workflows/ci.yml/badge.svg)](https://github.com/Warok-dev/affluence-gym/actions/workflows/ci.yml)

Application web mobile (PWA) qui affiche en temps réel l'affluence des salles d'entraînement d'un campus, à partir de **signalements anonymes** des étudiants. Elle montre aussi l'affluence typique heure par heure et une **prévision** (« probablement calme vers 18 h ») produite par un modèle de machine learning. Application non officielle : aucun compte, aucune donnée personnelle, aucun service de suivi.

Voir [PROJECT.md](PROJECT.md) pour la vision, les contraintes, les phases et les décisions d'architecture.

| Dossier | Contenu |
|---|---|
| `backend/` | API FastAPI, SQLAlchemy 2 + Alembic, SQLite (dev) ou PostgreSQL (prod) |
| `backend/app/forecast/` | Prévision : variables, modèles (baseline et gradient boosting), sélection, backtest |
| `docs/forecast-evaluation.md` | Méthode et résultats de l'évaluation hors ligne du modèle |
| `frontend/` | PWA React + Vite + TypeScript (mobile first, mode sombre, i18n fr/en) : affluence et suivi d'entraînements |
| `docker-compose.yml` | Stack locale identique à la prod : PostgreSQL + API + PWA servie par nginx |
| `.github/workflows/ci.yml` | CI : lint, tests (SQLite et PostgreSQL), build, images Docker et test de bout en bout |
| `render.yaml` | Déploiement Render (blueprint) |

## Prérequis

- Python 3.12 ou plus récent
- Node.js 20 ou plus récent (npm inclus)
- Optionnel : Docker Desktop (pour `docker compose`)

Les commandes ci-dessous sont pour **PowerShell** (Windows), depuis le dossier `affluence-gym`. Sous macOS/Linux, remplace `.venv\Scripts\python` par `.venv/bin/python`.

## Installation

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
```

```powershell
cd frontend
npm install
```

`requirements.txt` contient les dépendances d'exécution (utilisées par l'image Docker) ; `requirements-dev.txt` y ajoute pytest, httpx et ruff.

## Lancer en développement (ordinateur)

Deux terminaux :

```powershell
# Terminal 1 : API sur http://127.0.0.1:8000 (doc interactive : /docs)
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

```powershell
# Terminal 2 : interface sur http://localhost:5173
cd frontend
npm run dev
```

Le frontend appelle `/api/...` et Vite redirige ces requêtes vers le backend (proxy). L'appli reste ainsi sur une seule origine, ce qui fonctionne aussi depuis un téléphone. Au démarrage, l'API applique automatiquement les migrations de la base.

## Lancer avec Docker (stack de production en local)

```powershell
docker compose up --build
```

Ouvre http://localhost:8080. La stack lance PostgreSQL 17, l'API (image `backend/Dockerfile`) et la PWA servie par nginx (image `frontend/Dockerfile`), qui redirige `/api` vers l'API. Pour arrêter et effacer les données : `docker compose down -v`.

## Tester sur un téléphone

### Même Wi-Fi (sans installation)

1. Lance le backend et `npm run dev`.
2. Vite affiche une adresse `Network: http://192.168.x.x:5173`. Ouvre-la sur le téléphone.
3. Si la page ne charge pas, autorise Node.js dans le pare-feu Windows (réseau privé).

En `http://192.168.x.x`, l'appli fonctionne mais ne s'installe pas comme une PWA : les navigateurs exigent le **HTTPS**. Une fois l'appli déployée (voir « Déploiement »), utilise son URL `https://…onrender.com`. Avant ça, passe par un tunnel :

### Tunnel HTTPS temporaire (PWA installable)

1. Installe `cloudflared` une fois : `winget install --id Cloudflare.cloudflared`.
2. Lance le backend, puis `npm run build` et `npm run preview` dans `frontend/`.
3. Dans un autre terminal : `cloudflared tunnel --url http://localhost:4173`
4. Ouvre sur le téléphone l'URL `https://xxxx.trycloudflare.com` affichée, puis « Ajouter à l'écran d'accueil » (Chrome Android) ou Partager > « Sur l'écran d'accueil » (Safari iOS).

Pendant que le tunnel tourne, ton PC est joignable depuis Internet : coupe-le (Ctrl+C) après tes tests.

## Tests et qualité

```powershell
cd backend
.venv\Scripts\python -m pytest
.venv\Scripts\python -m ruff check .
.venv\Scripts\python -m ruff format --check .
```

```powershell
cd frontend
npm test
npm run build
```

La CI GitHub Actions lance tout ça à chaque push et à chaque PR, avec en plus :
- les tests backend **sur PostgreSQL** ;
- `alembic check`, qui vérifie que les modèles et les migrations correspondent ;
- la construction des deux images Docker, avec un test de bout en bout de la stack compose (signalement, puis lecture via nginx).

## Base de données et migrations (Alembic)

- **Dev** : SQLite (`backend/affluence.db`). **Prod** : PostgreSQL via `DATABASE_URL`. Les URL `postgres://` et `postgresql://` sont acceptées.
- Les migrations s'appliquent **au démarrage de l'API**. Une base créée avant Alembic (phases 2-3) est complétée, puis marquée à la révision `0001`, sans perte de données.
- Après une modification de `app/db.py`, génère une migration puis relis-la :

```powershell
cd backend
.venv\Scripts\python -m alembic revision --autogenerate -m "describe the change"
```

## Voir le graphique « affluence typique » avec des données de démo

Le graphique et la prévision ont besoin de plusieurs semaines d'historique. Pour les essayer tout de suite, on génère 16 semaines de données **fictives** dans une base séparée (`backend/demo.db`, ignorée par git) :

```powershell
cd backend
.venv\Scripts\python scripts\seed_demo.py
$env:DB_PATH = "demo.db"
$env:DEMO_DATA = "true"
.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

`DEMO_DATA=true` affiche dans l'appli le bandeau « Données de démonstration », pour que des chiffres fictifs ne passent jamais pour de vrais. Ferme ce terminal (ou lance `Remove-Item Env:DB_PATH, Env:DEMO_DATA`) pour revenir à la vraie base.

## Compteur officiel des tourniquets (nombre exact de personnes)

L'API peut recevoir les compteurs **agrégés** des tourniquets (entrées au scan de carte, sorties au tourniquet de sortie) et afficher « 47 personnes sur 120 places ». Ce qu'on demande à l'université : [docs/integration-compteurs.md](docs/integration-compteurs.md).

- `POST /official/{salle}/counts` avec l'en-tête `X-Api-Key: <OFFICIAL_API_KEY>` et `{"entries": 412, "exits": 365}` (cumuls depuis minuit ; `exits` absent si la sortie ne compte pas : la présence est alors **estimée**).
- Si le compteur se tait plus de 10 min, l'appli revient aux signalements des étudiants.
- Capacité des salles : `backend/app/facilities.py` (**valeurs provisoires**).

### Démo avec le simulateur (chiffres fictifs)

Terminal 1, l'API en mode démo :

```powershell
cd backend
$env:DB_PATH = "demo.db"; $env:DEMO_DATA = "true"; $env:OFFICIAL_API_KEY = "demo-key"
.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

Terminal 2, le simulateur qui joue le rôle du système de l'université (ajoute `--hour 18` pour montrer l'heure de pointe à n'importe quel moment, `--no-exits` pour le mode estimé) :

```powershell
cd backend
$env:OFFICIAL_API_KEY = "demo-key"
.venv\Scripts\python scripts\simulate_counter.py --hour 18
```

Terminal 3 : `cd frontend` puis `npm run dev`.

## Suivi d'entraînements (onglet Séances)

- Commencer une séance, ajouter des exercices (recherche), noter les séries (répétitions × charge) et les cocher. Cocher une série lance le minuteur de repos (réglable, vibration à la fin).
- « Dernière fois » rappelle la performance précédente et préremplit les séries.
- Historique, détail de chaque séance, records personnels, unité kg ou lb.
- **Les séances restent sur le téléphone** (aucun compte, rien sur le serveur). L'onglet propose d'exporter et d'importer une sauvegarde JSON : à faire avant de changer d'appareil ou d'effacer les données du navigateur.

## Prévision (machine learning)

- Deux modèles sont en concurrence. La **baseline** fait la moyenne par jour de semaine et heure. Le **gradient boosting** (scikit-learn) utilise l'heure, le jour, les jours fériés de l'Ontario et les périodes d'examens.
- Le modèle est réentraîné **en mémoire une fois par jour** à partir des snapshots. Celui qui a la plus petite erreur sur les 14 derniers jours est servi.
- Sans historique, `/forecast` répond `available: false`, et l'interface affiche les créneaux calmes tirés de l'historique.
- Les dates d'examens se trouvent dans `backend/app/forecast/features.py`. **Ce sont des valeurs provisoires, à vérifier.**

Pour lancer l'évaluation hors ligne (backtest à origine glissante, sans écriture dans la base) :

```powershell
cd backend
$env:DB_PATH = "demo.db"   # ou DATABASE_URL vers une copie de la prod
.venv\Scripts\python -m app.forecast.evaluate --folds 4
```

Méthode, résultats et limites : [docs/forecast-evaluation.md](docs/forecast-evaluation.md).

## Historique : tâche des snapshots

Toutes les 15 min, l'API enregistre l'affluence de chaque salle dans `occupancy_snapshots` (seulement s'il y a des signalements récents). Cette tâche tourne dans le processus de l'API. Pour la confier plutôt à un cron externe, mets `SNAPSHOT_ENABLED=false` et planifie `python -m app.snapshot`. Lancer la commande deux fois dans le même quart d'heure ne crée pas de doublon.

## Configuration

Toutes les variables sont listées dans [`.env.example`](.env.example).

| Variable | Où | Défaut | Rôle |
|---|---|---|---|
| `DATABASE_URL` | backend | *(vide)* | PostgreSQL (prod). Si elle est vide, la base SQLite `DB_PATH` est utilisée |
| `DB_PATH` | backend | `affluence.db` | Fichier SQLite (dev) |
| `ALLOWED_ORIGINS` | backend | `http://localhost:5173,http://127.0.0.1:5173` | Origines autorisées par CORS (séparées par des virgules) |
| `TIMEZONE` | backend | `America/Toronto` | Fuseau des salles (jours, heures, horaires d'ouverture) |
| `SNAPSHOT_ENABLED` | backend | `true` | Tâche des snapshots dans le processus de l'API |
| `DEMO_DATA` | backend | `false` | À mettre à `true` avec `demo.db` : l'appli signale les données fictives |
| `OFFICIAL_API_KEY` | backend | *(vide)* | Clé secrète du système de compteurs de l'université ; vide = réception désactivée |
| `OFFICIAL_STALE_SECONDS` | backend | `600` | Au-delà, un compteur silencieux est ignoré (retour aux signalements) |
| `AVERAGE_STAY_MINUTES` | backend | `75` | Durée moyenne d'une visite, pour l'estimation sans compteur de sortie |
| `PORT` | backend (Docker) | `8000` | Port d'écoute, fourni par l'hébergeur |
| `VITE_API_URL` | frontend (build) | *(vide → `/api`)* | URL publique de l'API en prod |
| `API_PROXY_TARGET` | frontend (dev) | `http://127.0.0.1:8000` | Cible du proxy `/api` de Vite |
| `API_UPSTREAM` | frontend (Docker) | `http://backend:8000` | Cible du proxy `/api` de nginx |

## API

| Méthode | Route | Réponse |
|---|---|---|
| `POST` | `/reports` | Body `{facility, level: 1-4, client_id}` → 201 ; 404 salle inconnue ; 422 invalide ; 429 déjà signalé il y a moins de 15 min |
| `GET` | `/occupancy/{facility}` | `{facility, level, label, reports, last_report_ts, source, people, capacity, estimated, updated_ts}` : compteur officiel s'il est frais (`source: "official"`, `people` = présents), sinon moyenne des signalements sur 30 min |
| `GET` | `/history/{facility}?days=7` | `{facility, days, points: [{ts, level, source}]}` (1 à 90 jours) |
| `GET` | `/profile/{facility}?weekday=&weeks=8` | Affluence moyenne par heure d'un jour de semaine (0 = lundi, défaut : aujourd'hui) : `{…, opening_hours, hours: [{hour, level, samples, calm}]}` |
| `GET` | `/forecast/{facility}?hours=12` | Prévision pour les prochaines heures d'ouverture (1 à 48) : `{available, model, trained_at, training_samples, validation_mae, hours: [{ts, hour, level, calm}], next_calm}` |
| `POST` | `/official/{facility}/counts` | Compteurs des tourniquets (en-tête `X-Api-Key`) : `{entries, exits?, ts?}` → 201 ; 401 clé invalide ; 503 réception non configurée |
| `GET` | `/health` | `{"status": "ok", "demo": false}` (champ `demo` additif), utilisé par les health checks (Docker, Render) |

Les horaires d'ouverture se configurent dans `backend/app/facilities.py`. **Les valeurs actuelles sont provisoires et à vérifier.**

## Déploiement (gratuit) : Render + Neon

| Brique | Service | Offre gratuite |
|---|---|---|
| API (Docker) | Render, web service | 750 h/mois, mise en veille après 15 min sans trafic (réveil en ~30-60 s) |
| PWA | Render, static site | CDN + HTTPS |
| PostgreSQL | Neon | Permanente, 1 Go (la base gratuite de Render expire après 30 jours) |

Mise en place, une seule fois (c'est toi qui crées les comptes) :

1. **Neon** : crée un compte sur neon.com, puis un projet `affluence-gym` dans la région **AWS US East 2 (Ohio)**. Copie la *connection string* (`postgresql://…?sslmode=require`).
2. **Render** : crée un compte sur render.com (connexion avec GitHub), puis **New > Blueprint** et choisis le repo `affluence-gym`. Render lit `render.yaml` et crée `affluence-gym-api` et `affluence-gym`.
3. Quand Render demande `DATABASE_URL`, colle la connection string Neon. Ne la commite jamais.
4. Vérifie les URL attribuées. Si Render ajoute un suffixe parce que le nom est pris, mets à jour les deux variables qui pointent l'une vers l'autre :
   - `ALLOWED_ORIGINS` de l'API = URL du site ;
   - `VITE_API_URL` du site = URL de l'API, puis redéploie le site.
5. Teste `https://affluence-gym-api.onrender.com/health`, puis ouvre `https://affluence-gym.onrender.com` sur ton téléphone et « Ajouter à l'écran d'accueil ».

Ensuite, c'est **automatique** : chaque push sur `main` relance la CI, et Render redéploie uniquement si elle passe (`autoDeployTrigger: checksPass`). Les migrations s'appliquent au démarrage de l'API.

Limites de l'offre gratuite :
- **Réveil lent** : après 15 min sans visite, la première requête attend que l'API redémarre (environ 30 à 60 s).
- **Snapshots** : la tâche des quarts d'heure ne tourne pas pendant la veille. Ce n'est pas grave, puisque l'API reste éveillée tant que quelqu'un a l'appli ouverte (elle se rafraîchit toutes les 45 s).

## Respect de la vie privée

- Le seul identifiant est un UUID aléatoire (`client_id`) généré au premier lancement et stocké dans le `localStorage`. Il ne sert qu'au délai anti-spam de 15 min.
- Aucun cookie, aucun analytics, aucune police ni aucun script tiers.
- Aucun secret dans le dépôt : `DATABASE_URL` se renseigne dans le tableau de bord Render.
