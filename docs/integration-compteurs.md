# Affluence Gym : afficher le nombre exact de personnes dans les salles

*Document destiné au service des sports et à son équipe informatique.*

## En une phrase

Affluence Gym est une application étudiante (non officielle) qui montre aux étudiants l'affluence des salles d'entraînement avant qu'ils se déplacent. Avec **deux compteurs agrégés** fournis par vos tourniquets, elle peut afficher le **nombre exact de personnes présentes**, sans aucune donnée personnelle.

## Ce que nous demandons, et seulement ça

Pour chaque salle (Minto, Montpetit), à intervalles réguliers (idéalement toutes les 1 à 5 minutes) :

| Donnée | Exemple | Obligatoire |
|---|---|---|
| Nombre d'**entrées** depuis minuit (tourniquet d'entrée, au scan de carte) | `412` | oui |
| Nombre de **sorties** depuis minuit (tourniquet de sortie), *si ce tourniquet a un compteur* | `365` | non |
| Heure de la lecture | `2026-10-02 18:05` | non (heure de réception par défaut) |

C'est tout. Nous calculons ensuite : **personnes présentes = entrées − sorties**.

Si le tourniquet de sortie ne compte pas les passages, l'application **estime** la présence à partir des seules entrées (entrées des 75 dernières minutes, durée moyenne d'une visite à ajuster avec vous). Elle affiche alors clairement « estimé ».

## Ce que nous ne demandons jamais

- Aucun nom, numéro d'étudiant, numéro de carte ni photo.
- Aucun détail par passage (qui, à quelle heure exactement).
- Aucun accès à votre système de cartes : c'est **votre** système qui nous envoie deux nombres, ou qui les met à disposition. Nous ne nous connectons à rien chez vous.

Les compteurs ne permettent de remonter à personne : ce sont des totaux, comme le chiffre qu'un agent obtiendrait en comptant les gens à l'entrée.

## Trois façons de nous transmettre les nombres (au choix de votre équipe)

1. **Envoi automatique (recommandé).** Votre système, ou un petit script de votre côté, envoie une requête HTTPS à chaque lecture :

   ```http
   POST https://<adresse-de-l-api>/official/minto/counts
   X-Api-Key: <clé secrète fournie par nous, propre à votre système>
   Content-Type: application/json

   {"entries": 412, "exits": 365}
   ```

   Réponses possibles :
   - `201` : enregistré ;
   - `401` : clé invalide ;
   - `422` : valeurs invalides (nombres négatifs, heure hors des dernières 24 h).

   La connexion est chiffrée (HTTPS), la clé se change à tout moment, et l'adresse n'accepte que ces deux nombres.
2. **Export de fichier.** Un fichier CSV (`salle, heure, entrées, sorties`) déposé régulièrement à un endroit convenu ; nous l'importons.
3. **Accès en lecture.** Une adresse de votre côté qui renvoie les deux compteurs ; nous la consultons toutes les minutes.

## Ce que l'application fait de ces nombres

- Elle affiche « **47 personnes sur 120 places** », en temps réel, pour chaque salle, ainsi que la plus calme des deux.
- Elle traduit le taux d'occupation en quatre niveaux (Vide, Calme, Modéré, Bondé) : moins de 25 %, 25 à 50 %, 50 à 75 %, 75 % et plus. Ces seuils sont ajustables.
- Elle ne tient compte que des lectures du jour (les compteurs repartent de zéro à minuit) et n'affiche jamais de nombre négatif.
- Si les compteurs cessent d'arriver pendant plus de 10 minutes, elle revient automatiquement aux signalements des étudiants.
- Elle enregistre l'affluence tous les quarts d'heure. Cet historique sert à montrer l'affluence typique heure par heure et à **prévoir les heures calmes** (modèle de prévision intégré).

## Ce que la salle y gagne

- Des étudiants qui choisissent les heures creuses, donc **moins de cohue aux heures de pointe**.
- Un historique de fréquentation par quart d'heure, que nous pouvons vous **rendre sous forme de rapport** (jours et heures les plus chargés).
- Aucun travail de votre côté une fois l'envoi en place, et aucun coût.

## Questions pour vous

1. Le tourniquet de sortie compte-t-il les passages ?
2. Quelle est la **capacité** de chaque salle (nombre maximal de personnes) ?
3. Quelle façon de transmettre les nombres vous convient le mieux (1, 2 ou 3) ?
4. Quelles sont les heures d'ouverture exactes, et les périodes d'examens à connaître ?
5. Souhaitez-vous que l'application porte une mention particulière, ou reste clairement « non officielle » ?

## Démonstration

Pour la démonstration, un **simulateur** joue le rôle de votre système : il envoie des compteurs **fictifs** par exactement la même adresse sécurisée. L'application affiche alors le bandeau « Données de démonstration ».

## Annexe technique (équipe informatique)

- API : FastAPI (Python), base PostgreSQL. Code source ouvert : https://github.com/Warok-dev/affluence-gym
- Endpoint : `POST /official/{salle}/counts`, en-tête `X-Api-Key`. Corps : `entries` (entier ≥ 0), `exits` (entier ≥ 0 ou absent), `ts` (secondes epoch, optionnel, dans les dernières 24 h).
- Les compteurs sont cumulés depuis minuit (heure de Toronto). Seule la lecture la plus récente du jour sert au calcul ; les lectures des jours précédents sont ignorées.
- Stockage : seulement `salle, heure, entrées, sorties`. Aucune autre donnée n'est acceptée.
