export const fr = {
  appTitle: "Affluence Gym",
  appTagline: "Affluence signalée par les étudiants",
  levels: { 1: "Vide", 2: "Calme", 3: "Modéré", 4: "Bondé" },
  noData: "Pas de données",
  loading: "Chargement…",
  loadError: "Impossible de charger l'affluence",
  reportsCount: (n: number) => (n <= 1 ? `${n} signalement récent` : `${n} signalements récents`),
  justNow: "à l'instant",
  minutesAgo: (m: number) => `il y a ${m} min`,
  lastReport: (ago: string) => `Dernier signalement ${ago}`,
  reportButton: "Signaler l'affluence",
  cancel: "Annuler",
  reportPrompt: "Il y a combien de monde ?",
  reportLevel: (label: string) => `Signaler : ${label}`,
  sending: "Envoi…",
  success: "Merci ! Ton signalement est enregistré.",
  cooldown: "Tu as déjà signalé cette salle il y a moins de 15 min. Réessaie un peu plus tard.",
  sendError: "Échec de l'envoi. Vérifie ta connexion et réessaie.",
  footer: "Application non officielle · aucune donnée personnelle collectée",
};

export type Messages = typeof fr;
