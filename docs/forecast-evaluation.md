# Prévision d'affluence : modèle et évaluation hors ligne

> **Les résultats ci-dessous sont mesurés sur des données de démo SYNTHÉTIQUES** (`scripts/seed_demo.py`).
> Ils valident la chaîne (entraînement, sélection, service, évaluation), **pas** la qualité réelle du modèle.
> Il faudra refaire l'évaluation quand l'appli aura accumulé quelques semaines de vrais signalements (voir « Refaire l'évaluation »).

## Problème

Il s'agit de prédire le **niveau moyen d'affluence (1 = Vide … 4 = Bondé)** de chaque salle pour les prochaines heures d'ouverture. Les données d'entraînement sont les snapshots pris tous les quarts d'heure (`occupancy_snapshots`), sur les 26 dernières semaines.

La sortie utilisateur est la phrase « Prévision : probablement calme vers 18 h ». Une heure est **calme** si son niveau prédit est ≤ 2.

## Variables

| Variable | Origine |
|---|---|
| `facility` | salle (variable catégorielle) |
| `weekday`, `weekend` | jour de semaine local (`America/Toronto`) |
| `hour`, `hour_sin`, `hour_cos` | heure locale fractionnaire et son encodage cyclique |
| `holiday` | jours fériés de l'Ontario (bibliothèque `holidays`) |
| `exam` | périodes d'examens (`app/forecast/features.py`, **dates provisoires à vérifier**) |

**Pas encore utilisée : la météo.** Elle demande une source externe (par exemple Open-Meteo, gratuite et sans clé) pour l'historique **et** pour les prévisions. Il suffira d'ajouter une colonne dans `features.py`, puis de vérifier par backtest qu'elle améliore réellement l'erreur.

## Modèles

| Nom | Description |
|---|---|
| `baseline` | Moyenne par (salle, jour, heure), avec repli sur (salle, heure), puis sur la salle, puis sur la moyenne globale. C'est ce que montre le graphique « affluence typique ». |
| `gbm` | `HistGradientBoostingRegressor` (scikit-learn) : 300 itérations, taux d'apprentissage 0,05, 15 feuilles, `min_samples_leaf=20`, L2 = 1. Prédictions bornées à [1, 4]. |

## Sélection automatique en production

`app/forecast/service.py` réentraîne le modèle **en mémoire une fois par jour**, sans fichier de modèle, car l'hébergement gratuit n'a pas de disque persistant :

1. Les données sont **découpées dans le temps** : les 14 derniers jours servent à la validation, jamais mélangés au reste.
2. Le `gbm` n'est candidat qu'avec au moins 500 snapshots d'entraînement ; en dessous, seule la baseline est considérée.
3. Le modèle à la plus petite **MAE de validation** gagne, puis il est réentraîné sur toutes les données.
4. `GET /forecast/{facility}` expose `model`, `trained_at`, `training_samples` et `validation_mae`, pour la transparence et le suivi.

L'entraînement prend moins d'une seconde pour environ 14 000 snapshots.

## Protocole d'évaluation hors ligne

Il s'agit d'un **backtest à origine glissante** (`python -m app.forecast.evaluate --folds 4 --fold-days 7`). Pour chacune des 4 dernières semaines, chaque modèle est entraîné sur **tout ce qui précède** la semaine, puis testé sur cette semaine. Les métriques sont moyennées sur les 4 semaines.

Métriques :
- **MAE** et **RMSE** sur le niveau ;
- **exactitude** du niveau arrondi ;
- **F1 de la classe « calme »**, la plus proche de la décision de l'utilisateur.

## Résultats (données synthétiques, 16 semaines, 13 952 snapshots, 2026-10-01)

| Modèle | MAE ↓ | RMSE ↓ | Exactitude du niveau ↑ | F1 « calme » ↑ |
|---|---|---|---|---|
| baseline | 0,440 | 0,629 | 65,0 % | 0,778 |
| **gbm** | **0,395** | **0,565** | **67,7 %** | **0,791** |

Validation de production (14 derniers jours) : `gbm` 0,404 contre `baseline` 0,410, donc **`gbm` est sélectionné**.

Lecture :
- Le bruit des données de démo (±1 niveau avec une probabilité de 2/5) fixe une **erreur plancher d'environ 0,4** de MAE : les deux modèles en sont proches, et aucun modèle ne peut faire mieux.
- L'avantage du `gbm` vient surtout de la semaine de la **fête du Travail** : il a appris l'effet « jour férié » sur la fête du Canada et l'applique, alors que la baseline prédit un lundi ordinaire.
- Hors jours spéciaux, les deux modèles sont équivalents. C'est attendu : la baseline capte déjà l'essentiel du motif hebdomadaire.

## Limites

- **Données participatives** : le niveau mesuré dépend des personnes qui signalent (biais de sélection, peu de signalements aux heures creuses). Un compteur officiel (`OfficialCounterSource`, PROJECT.md §8) changerait la nature de la cible.
- **Démarrage à froid** : sans historique, `/forecast` répond `available: false` et l'interface revient aux créneaux calmes de l'historique.
- **Peu de jours fériés et d'examens** par an : leurs effets mettront des mois à être appris de façon fiable.
- Le modèle ne donne pas encore d'**incertitude** ; une régression quantile serait une évolution possible.

## Refaire l'évaluation (vraies données)

En local, sur une copie de la base :

```powershell
cd backend
$env:DATABASE_URL = "<connection string Neon en lecture>"
.venv\Scripts\python -m app.forecast.evaluate --folds 4
Remove-Item Env:DATABASE_URL
```

Mets ensuite à jour le tableau ci-dessus en indiquant la date et le nombre de snapshots.
