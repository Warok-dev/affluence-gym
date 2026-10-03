# Préparer la rencontre avec le service des sports

*Document pour toi (pas à remettre). Le document à leur laisser est [`integration-compteurs.md`](integration-compteurs.md).*

## Le message en une phrase

> « Vos tourniquets savent déjà combien de personnes entrent. Avec deux nombres par salle, sans aucune donnée personnelle, les étudiants verraient en temps réel combien de monde il y a, et iraient aux heures creuses. »

Tout le reste de la démo sert à rendre cette phrase concrète.

## La veille

- [ ] `git pull` sur `main`, puis lancer `demo.ps1` une fois pour vérifier que tout démarre.
- [ ] Ordinateur et téléphone sur le **même Wi-Fi**. Note l'adresse affichée par `demo.ps1` (`http://192.168.x.x:5173`).
- [ ] Sur le téléphone : ouvrir l'adresse, ajouter l'appli à l'écran d'accueil (elle s'ouvre alors en plein écran, comme une vraie appli).
- [ ] Faire 2 ou 3 séances d'exemple dans l'onglet Séances (développé couché, squat…) pour que la courbe de progression ne soit pas vide.
- [ ] Imprimer `integration-compteurs.md` (2 pages) en 2 exemplaires.
- [ ] Prévoir un plan B sans Wi-Fi : un partage de connexion du téléphone vers l'ordinateur suffit.

## Le jour même, 10 minutes avant

1. `powershell -ExecutionPolicy Bypass -File .\demo.ps1` (heure de pointe simulée : 18 h). Pour une salle plus vide : `-Hour 9`.
2. Vérifier que le bandeau « Données de démonstration » est visible : **ne jamais présenter ces chiffres comme réels**.
3. Ouvrir le mode écran sur l'ordinateur avec l'adresse Wi-Fi (`…:5173/#/ecran`), touche `F11`.

## Déroulé de la démo (5 minutes)

| Temps | Montrer | Dire |
|---|---|---|
| 0:00 | **Mode écran** sur l'ordinateur (plein écran) | « Voilà ce qu'afficherait une télé à l'entrée, ou votre écran au comptoir. Le nombre bouge en direct : ici, c'est un simulateur qui joue le rôle de vos tourniquets. » |
| 0:45 | Scanner le **code QR** avec ton téléphone | « Un étudiant scanne et a la même info dans sa poche. Pas de compte, pas d'inscription. » |
| 1:15 | Téléphone : onglet **Affluence**, « Plus calme » en ambre | « Il voit tout de suite quelle salle est la moins pleine. » |
| 1:45 | « Quand y aller aujourd'hui » puis **Voir la semaine type** | « Avec l'historique, on sait quand c'est calme. Cette grille, c'est aussi un outil pour vous : jours et heures de pointe, pour planifier le personnel ou l'entretien. » |
| 2:45 | Bouton **EN** | « Bilingue, tout le contenu. » |
| 3:15 | Onglet **Matériel** | « Les étudiants signalent une machine en panne. Avec votre liste de machines, on pourrait vous transmettre ces signalements. » |
| 3:45 | Onglets **Séances** et **Exercices** (courbe de progression) | « C'est aussi une vraie appli d'entraînement, et les séances restent sur le téléphone de l'étudiant. » |
| 4:30 | Retour au document imprimé | « Ce qu'il nous faut de votre côté : deux nombres par salle, c'est tout. » |

## Ce qu'on leur demande (dans l'ordre d'importance)

1. **Les compteurs** d'entrées (et de sorties si le tourniquet de sortie compte) : section « Ce que nous demandons » du document.
2. La **capacité** de chaque salle.
3. Les **heures d'ouverture** exactes et les périodes d'examens.
4. La **liste des machines** (facultatif).
5. Un **contact** dans l'équipe informatique.

Ne pas demander d'accès à leur système : c'est eux qui envoient deux nombres.

## Objections probables et réponses

**« Et la vie privée ? »**
Aucun nom, numéro d'étudiant, numéro de carte ni détail par passage. Seulement deux totaux par salle, comme un agent qui compterait à la porte. Pas de compte utilisateur, pas de cookie, pas de statistiques de visite. Les séances d'entraînement restent sur le téléphone.

**« Et la sécurité ? »**
L'adresse d'envoi n'accepte que deux nombres, en HTTPS, avec une clé secrète propre à leur système, changeable à tout moment. L'appli ne se connecte à rien chez eux. Le code source est ouvert : leur équipe peut le lire.

**« Combien ça coûte ? Qui s'en occupe ? »**
Rien : hébergement gratuit (Render + Neon). Une fois l'envoi en place, aucun travail de leur côté. Si les compteurs s'arrêtent, l'appli revient toute seule aux signalements des étudiants : rien ne casse.

**« Le tourniquet de sortie ne compte pas. »**
Prévu : l'appli estime la présence à partir des entrées et de la durée moyenne d'une visite, et affiche clairement « estimé ». À montrer avec `demo.ps1 -NoExits`.

**« Ce n'est pas une appli officielle. »**
Justement : elle reste clairement « non officielle », sans logo ni nom de l'université. On leur demande seulement s'ils souhaitent une mention particulière (question 5 du document).

**« Et si les chiffres sont faux ? »**
L'appli affiche l'heure de la dernière lecture ; au-delà de 10 minutes sans données, elle n'utilise plus le compteur. Jamais de nombre négatif. On peut comparer pendant une semaine avec un comptage manuel.

**« Pourquoi ne pas le faire nous-mêmes ? »**
Ils peuvent ! Le code est ouvert. Mais c'est déjà prêt, testé (plus de 170 tests automatiques) et ne leur demande rien.

## Après la rencontre

- Envoyer un courriel de remerciement le jour même, avec le document en pièce jointe et les réponses obtenues.
- Remplacer dans le code les valeurs provisoires dès qu'on les a : capacité et horaires (`backend/app/facilities.py`), dates d'examens (`backend/app/forecast/features.py`), machines (`backend/app/equipment.py`).
- Générer leur clé d'API (`OFFICIAL_API_KEY`) et la leur transmettre par un canal sûr, jamais par courriel en clair avec l'adresse.
