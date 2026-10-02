// How to perform each exercise. Original texts written for this project (French UI),
// kept short: a few steps and the one mistake to avoid. Ids match exercises.ts.

export interface ExerciseGuide {
  muscles: string;
  equipment: string;
  steps: string[];
  tip: string;
}

export const GUIDES: Record<string, ExerciseGuide> = {
  "bench-press": {
    muscles: "Pectoraux, triceps, avant des épaules",
    equipment: "Barre et banc plat",
    steps: [
      "Allonge-toi, yeux sous la barre, pieds à plat au sol.",
      "Serre les omoplates et prends la barre un peu plus large que les épaules.",
      "Descends la barre jusqu'au bas des pectoraux, coudes à environ 45° du corps.",
      "Pousse la barre vers le haut en gardant les fesses sur le banc.",
    ],
    tip: "Ne fais pas rebondir la barre sur la poitrine. Avec une charge lourde, demande quelqu'un pour assurer.",
  },
  "incline-dumbbell-press": {
    muscles: "Haut des pectoraux, épaules, triceps",
    equipment: "Haltères et banc incliné (30 à 45°)",
    steps: [
      "Assieds-toi sur le banc incliné, un haltère dans chaque main au niveau des épaules.",
      "Pousse les haltères au-dessus de la poitrine en les rapprochant légèrement.",
      "Redescends lentement jusqu'à sentir l'étirement des pectoraux.",
    ],
    tip: "Garde les poignets droits, alignés au-dessus des coudes.",
  },
  "chest-fly-machine": {
    muscles: "Pectoraux",
    equipment: "Machine à écarté (pec deck)",
    steps: [
      "Règle le siège pour que les poignées soient à hauteur de poitrine.",
      "Rapproche les bras devant toi en gardant les coudes légèrement fléchis.",
      "Reviens lentement sans laisser les charges claquer.",
    ],
    tip: "Le mouvement vient des pectoraux : ne pousse pas avec les mains.",
  },
  "push-up": {
    muscles: "Pectoraux, triceps, gainage",
    equipment: "Aucun",
    steps: [
      "Mains au sol un peu plus larges que les épaules, corps droit de la tête aux talons.",
      "Descends la poitrine près du sol, coudes à environ 45°.",
      "Pousse pour revenir bras tendus.",
    ],
    tip: "Ne laisse pas les hanches s'affaisser. Trop dur ? Fais-les genoux au sol ou mains sur un banc.",
  },
  dips: {
    muscles: "Pectoraux, triceps, épaules",
    equipment: "Barres parallèles",
    steps: [
      "En appui bras tendus sur les barres, épaules basses.",
      "Descends en fléchissant les coudes jusqu'à environ 90°.",
      "Remonte en poussant sur les barres.",
    ],
    tip: "Ne descends pas plus bas que ce que tes épaules tolèrent sans douleur.",
  },
  deadlift: {
    muscles: "Arrière des cuisses, fessiers, dos",
    equipment: "Barre",
    steps: [
      "Pieds largeur de hanches, barre au-dessus du milieu des pieds.",
      "Penche-toi hanches en arrière, attrape la barre, dos plat, poitrine sortie.",
      "Pousse dans le sol et redresse-toi en gardant la barre collée aux jambes.",
      "Redescends en reculant les hanches d'abord.",
    ],
    tip: "Le dos ne doit jamais s'arrondir. Commence léger et soigne la technique avant la charge.",
  },
  "pull-up": {
    muscles: "Dos (grand dorsal), biceps",
    equipment: "Barre de traction",
    steps: [
      "Suspends-toi, mains un peu plus larges que les épaules, paumes vers l'avant.",
      "Tire les coudes vers le bas jusqu'à passer le menton au-dessus de la barre.",
      "Redescends bras tendus, sans élan.",
    ],
    tip: "Pas encore de traction complète ? Utilise un élastique ou la machine d'assistance.",
  },
  "lat-pulldown": {
    muscles: "Dos (grand dorsal), biceps",
    equipment: "Poulie haute",
    steps: [
      "Assieds-toi cuisses bloquées, mains larges sur la barre.",
      "Tire la barre jusqu'au haut de la poitrine en abaissant les épaules.",
      "Remonte lentement jusqu'à bras tendus.",
    ],
    tip: "Ne te penche pas en arrière pour tricher : le buste reste presque vertical.",
  },
  "barbell-row": {
    muscles: "Haut du dos, dorsaux, biceps",
    equipment: "Barre",
    steps: [
      "Buste penché vers l'avant, dos plat, genoux légèrement fléchis.",
      "Tire la barre vers le bas du ventre en serrant les omoplates.",
      "Redescends sous contrôle.",
    ],
    tip: "Garde le dos immobile : si le buste se relève à chaque répétition, allège.",
  },
  "seated-cable-row": {
    muscles: "Haut du dos, dorsaux, biceps",
    equipment: "Poulie basse",
    steps: [
      "Assieds-toi, pieds sur les cales, dos droit.",
      "Tire la poignée vers le ventre en serrant les omoplates.",
      "Reviens bras tendus en laissant les épaules avancer un peu.",
    ],
    tip: "Ne balance pas le buste d'avant en arrière.",
  },
  "back-squat": {
    muscles: "Cuisses (quadriceps), fessiers",
    equipment: "Barre et rack",
    steps: [
      "Barre posée sur le haut du dos, pieds largeur d'épaules, pointes légèrement ouvertes.",
      "Descends en poussant les hanches en arrière et les genoux dans l'axe des pieds.",
      "Va au moins jusqu'aux cuisses parallèles si ta mobilité le permet.",
      "Remonte en poussant dans tout le pied.",
    ],
    tip: "Règle les sécurités du rack juste sous ton point le plus bas.",
  },
  "leg-press": {
    muscles: "Cuisses, fessiers",
    equipment: "Presse à cuisses",
    steps: [
      "Dos et bassin collés au dossier, pieds largeur d'épaules sur la plateforme.",
      "Descends la plateforme jusqu'à ce que les genoux forment environ 90°.",
      "Pousse sans verrouiller complètement les genoux en haut.",
    ],
    tip: "Le bas du dos ne doit pas décoller du dossier en bas du mouvement.",
  },
  "romanian-deadlift": {
    muscles: "Arrière des cuisses, fessiers",
    equipment: "Barre ou haltères",
    steps: [
      "Debout, barre en main, genoux légèrement fléchis.",
      "Pousse les hanches en arrière en faisant glisser la barre le long des cuisses.",
      "Descends jusqu'à sentir l'étirement derrière les cuisses, puis remonte.",
    ],
    tip: "Dos plat tout le long : l'amplitude s'arrête là où le dos voudrait s'arrondir.",
  },
  "walking-lunge": {
    muscles: "Cuisses, fessiers",
    equipment: "Aucun ou haltères",
    steps: [
      "Fais un grand pas en avant.",
      "Descends jusqu'à ce que le genou arrière frôle le sol.",
      "Pousse sur la jambe avant et enchaîne avec l'autre jambe.",
    ],
    tip: "Le genou avant reste dans l'axe du pied, sans rentrer vers l'intérieur.",
  },
  "leg-curl": {
    muscles: "Arrière des cuisses",
    equipment: "Machine leg curl",
    steps: [
      "Règle le boudin juste au-dessus des talons.",
      "Fléchis les genoux pour ramener les talons vers les fesses.",
      "Reviens lentement.",
    ],
    tip: "Le bassin reste plaqué : s'il se soulève, la charge est trop lourde.",
  },
  "leg-extension": {
    muscles: "Cuisses (quadriceps)",
    equipment: "Machine leg extension",
    steps: [
      "Assieds-toi, genoux alignés avec l'axe de la machine.",
      "Tends les jambes jusqu'à l'horizontale.",
      "Redescends sous contrôle.",
    ],
    tip: "Évite les à-coups en haut du mouvement.",
  },
  "calf-raise": {
    muscles: "Mollets",
    equipment: "Machine ou marche",
    steps: [
      "Avant des pieds sur le rebord, talons dans le vide.",
      "Monte sur la pointe des pieds le plus haut possible.",
      "Redescends lentement sous le niveau du rebord.",
    ],
    tip: "Marque une courte pause en haut et en bas : pas de rebond.",
  },
  "hip-thrust": {
    muscles: "Fessiers, arrière des cuisses",
    equipment: "Barre et banc",
    steps: [
      "Haut du dos appuyé sur un banc, barre sur les hanches (avec un coussin).",
      "Pieds à plat, pousse les hanches vers le haut jusqu'à l'alignement épaules-genoux.",
      "Serre les fessiers en haut puis redescends.",
    ],
    tip: "Menton rentré, côtes basses : ne cambre pas le bas du dos en haut.",
  },
  "overhead-press": {
    muscles: "Épaules, triceps",
    equipment: "Barre",
    steps: [
      "Debout, barre devant les épaules, mains un peu plus larges que les épaules.",
      "Serre les fessiers et le ventre, pousse la barre au-dessus de la tête.",
      "Passe la tête légèrement sous la barre en haut, puis redescends.",
    ],
    tip: "Ne te cambre pas pour pousser : si le dos se creuse, allège.",
  },
  "dumbbell-shoulder-press": {
    muscles: "Épaules, triceps",
    equipment: "Haltères, banc à dossier",
    steps: [
      "Assis dos droit, haltères à hauteur d'oreilles.",
      "Pousse vers le haut sans que les haltères se touchent.",
      "Redescends lentement.",
    ],
    tip: "Garde les avant-bras verticaux.",
  },
  "lateral-raise": {
    muscles: "Côté des épaules",
    equipment: "Haltères",
    steps: [
      "Debout, haltères le long du corps, coudes légèrement fléchis.",
      "Monte les bras sur les côtés jusqu'à hauteur d'épaules.",
      "Redescends lentement.",
    ],
    tip: "Charge légère et mouvement propre valent mieux que l'élan.",
  },
  "face-pull": {
    muscles: "Arrière des épaules, haut du dos",
    equipment: "Poulie haute et corde",
    steps: [
      "Corde à hauteur de visage, recule pour tendre le câble.",
      "Tire la corde vers le front en écartant les mains.",
      "Reviens bras tendus.",
    ],
    tip: "Coudes hauts, au niveau des épaules ou au-dessus.",
  },
  "barbell-curl": {
    muscles: "Biceps",
    equipment: "Barre",
    steps: [
      "Debout, barre en mains paumes vers l'avant, coudes près du corps.",
      "Fléchis les coudes pour monter la barre vers les épaules.",
      "Redescends complètement.",
    ],
    tip: "Les coudes restent fixes : pas de balancement du buste.",
  },
  "dumbbell-curl": {
    muscles: "Biceps",
    equipment: "Haltères",
    steps: [
      "Haltères le long du corps, paumes vers l'avant.",
      "Monte les haltères en gardant les coudes collés au corps.",
      "Redescends lentement.",
    ],
    tip: "Tu peux alterner bras gauche et bras droit pour mieux te concentrer.",
  },
  "hammer-curl": {
    muscles: "Biceps, avant-bras",
    equipment: "Haltères",
    steps: [
      "Haltères le long du corps, paumes face à face.",
      "Monte en gardant cette prise neutre.",
      "Redescends sous contrôle.",
    ],
    tip: "Les poignets restent droits.",
  },
  "triceps-pushdown": {
    muscles: "Triceps",
    equipment: "Poulie haute",
    steps: [
      "Face à la poulie, coudes collés au corps.",
      "Pousse la barre ou la corde vers le bas jusqu'à bras tendus.",
      "Remonte jusqu'à ce que les avant-bras dépassent l'horizontale.",
    ],
    tip: "Seuls les avant-bras bougent.",
  },
  "skull-crusher": {
    muscles: "Triceps",
    equipment: "Barre EZ et banc",
    steps: [
      "Allongé, barre tenue bras tendus au-dessus de la poitrine.",
      "Fléchis les coudes pour descendre la barre vers le front.",
      "Tends les bras pour revenir.",
    ],
    tip: "Les coudes pointent vers le plafond et ne s'écartent pas.",
  },
  plank: {
    muscles: "Gainage (abdominaux, dos)",
    equipment: "Aucun",
    steps: [
      "En appui sur les avant-bras et les pointes de pieds.",
      "Corps droit, fessiers et ventre serrés.",
      "Tiens la position ; note les secondes comme répétitions.",
    ],
    tip: "Respire normalement et arrête dès que les hanches tombent.",
  },
  crunch: {
    muscles: "Abdominaux",
    equipment: "Aucun",
    steps: [
      "Allongé, genoux fléchis, pieds au sol.",
      "Enroule le haut du dos pour décoller les épaules.",
      "Redescends lentement.",
    ],
    tip: "Ne tire pas sur la nuque avec les mains.",
  },
  "hanging-leg-raise": {
    muscles: "Abdominaux, fléchisseurs de hanche",
    equipment: "Barre de traction",
    steps: [
      "Suspends-toi, bras tendus.",
      "Monte les genoux (ou les jambes tendues) vers la poitrine.",
      "Redescends sans te balancer.",
    ],
    tip: "Commence genoux fléchis, puis tends les jambes quand c'est facile.",
  },
  "rowing-machine": {
    muscles: "Cardio, jambes, dos",
    equipment: "Rameur",
    steps: [
      "Pousse d'abord avec les jambes, puis bascule le buste, puis tire les bras.",
      "Reviens dans l'ordre inverse : bras, buste, jambes.",
      "Note les minutes comme répétitions.",
    ],
    tip: "La puissance vient des jambes : ne tire pas seulement avec les bras.",
  },
  treadmill: {
    muscles: "Cardio",
    equipment: "Tapis de course",
    steps: ["Commence par quelques minutes de marche.", "Augmente la vitesse progressivement.", "Note les minutes."],
    tip: "Évite de t'agripper aux poignées en courant.",
  },
  bike: {
    muscles: "Cardio, jambes",
    equipment: "Vélo stationnaire",
    steps: [
      "Règle la selle : jambe presque tendue en bas du pédalage.",
      "Pédale à un rythme régulier.",
      "Note les minutes.",
    ],
    tip: "Une résistance modérée ménage les genoux.",
  },
};

export function getGuide(exerciseId: string): ExerciseGuide | undefined {
  return GUIDES[exerciseId];
}
