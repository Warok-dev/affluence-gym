# Affluence Gym

Application web mobile (PWA) qui affiche en temps réel l'affluence des salles d'entraînement d'un campus, à partir de **signalements anonymes** des étudiants. Application non officielle : aucun compte, aucune donnée personnelle, aucun service de suivi.

Voir [PROJECT.md](PROJECT.md) pour la vision, les contraintes et les phases.

| Dossier | Contenu |
|---|---|
| `backend/` | API FastAPI + SQLite (`POST /reports`, `GET /occupancy/{facility}`, `GET /health`) |
| `frontend/` | PWA React + Vite + TypeScript (mobile first, mode sombre, i18n fr/en) |

## Prérequis

- Python 3.12 ou plus récent
- Node.js 20 ou plus récent (npm inclus)

Les commandes ci-dessous sont pour **PowerShell** (Windows), depuis le dossier `affluence-gym`. Sous macOS/Linux, remplace `.venv\Scripts\python` par `.venv/bin/python`.

## Installation

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

```powershell
cd frontend
npm install
```

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

Le frontend appelle `/api/...` et Vite redirige ces requêtes vers le backend (proxy). L'appli reste ainsi sur une seule origine, ce qui fonctionne aussi depuis un téléphone.

## Tester sur un téléphone (même Wi-Fi)

1. Lance le backend comme ci-dessus (il peut rester sur `127.0.0.1` : c'est Vite qui le contacte).
2. Lance le frontend : `npm run dev` (ou `npm run build` puis `npm run preview` pour la version PWA, port 4173).
3. Vite affiche une adresse `Network: http://192.168.x.x:5173`. Ouvre-la sur le téléphone.
4. Si la page ne charge pas, autorise Node.js dans le pare-feu Windows (réseau privé).

> **Installation PWA sur téléphone :** les navigateurs n'activent le service worker qu'en **HTTPS** (ou sur `localhost`). En `http://192.168.x.x`, l'appli fonctionne mais n'est pas installable comme une vraie PWA. Sur ordinateur, `http://localhost:4173` est installable. Pour le téléphone, voir la section suivante.

## Installer la PWA sur un téléphone (HTTPS via un tunnel)

On utilise un « quick tunnel » Cloudflare : gratuit, sans compte, avec une URL HTTPS temporaire.

1. Installe `cloudflared` une fois (Windows : `winget install --id Cloudflare.cloudflared`).
2. Lance le backend, puis `npm run build` et `npm run preview` dans `frontend/`.
3. Dans un autre terminal : `cloudflared tunnel --url http://localhost:4173`
4. Ouvre sur le téléphone l'URL `https://xxxx.trycloudflare.com` affichée, puis « Ajouter à l'écran d'accueil » (Chrome Android) ou Partager > « Sur l'écran d'accueil » (Safari iOS).

L'URL change à chaque lancement du tunnel, et le tunnel ne sert qu'à tester. Pendant qu'il tourne, ton serveur local est joignable depuis Internet : coupe-le (Ctrl+C) après tes tests. L'URL définitive viendra avec le déploiement (phase 4).

## Tester la PWA (installable, hors ligne)

```powershell
cd frontend
npm run build
npm run preview        # http://localhost:4173
```

Dans Chrome ou Edge : icône « Installer » dans la barre d'adresse. DevTools > Application > Manifest / Service workers pour vérifier.

## Tests

```powershell
cd backend
.venv\Scripts\python -m pytest
```

```powershell
cd frontend
npm test
```

## Configuration

| Variable | Où | Défaut | Rôle |
|---|---|---|---|
| `DB_PATH` | backend | `affluence.db` | Fichier SQLite |
| `ALLOWED_ORIGINS` | backend | `http://localhost:5173,http://127.0.0.1:5173` | Origines autorisées par CORS (séparées par des virgules) |
| `VITE_API_URL` | frontend | `/api` | URL de l'API. Mets `http://localhost:8000` pour appeler le backend directement (CORS) |
| `API_PROXY_TARGET` | frontend | `http://127.0.0.1:8000` | Cible du proxy `/api` de Vite (dev et preview) |

Voir `frontend/.env.example`.

## API

| Méthode | Route | Réponse |
|---|---|---|
| `POST` | `/reports` | Body `{facility, level: 1-4, client_id}` → 201 ; 404 salle inconnue ; 422 invalide ; 429 déjà signalé il y a moins de 15 min |
| `GET` | `/occupancy/{facility}` | `{facility, level, label, reports, last_report_ts}` (moyenne sur 30 min ; `level`/`last_report_ts` = `null` sans données) |
| `GET` | `/health` | `{"status": "ok"}` |

`last_report_ts` (epoch en secondes du dernier signalement) a été ajouté en phase 2. C'est un champ **additif** : les quatre champs d'origine ne changent pas.

## Respect de la vie privée

- Le seul identifiant est un UUID aléatoire (`client_id`) généré au premier lancement et stocké dans le `localStorage`. Il ne sert qu'au délai anti-spam de 15 min.
- Aucun cookie, aucun analytics, aucune police ni aucun script tiers.

## Déploiement

Prévu en phase 4 (Docker, PostgreSQL, CI GitHub Actions, hébergeur gratuit).
