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
  // Phase 3: typical day / best time to go
  /** "06:30" -> "6 h 30", "23:00" -> "23 h" */
  time: (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  },
  hour: (h: number) => `${h} h`,
  openToday: (open: string, close: string) => `Ouvert aujourd'hui de ${open} à ${close}`,
  closedToday: "Fermé aujourd'hui",
  closedNow: "Fermé en ce moment",
  typicalDay: "Affluence typique aujourd'hui",
  notEnoughHistory: "Pas encore assez d'historique pour ce jour de la semaine.",
  calmLater: (hours: string) => `Plutôt calme plus tard vers ${hours}`,
  noCalmLater: "Aucun créneau calme connu pour le reste de la journée.",
  list: (items: string[]) => new Intl.ListFormat("fr", { type: "conjunction" }).format(items),
  hourDetail: (hour: string, label: string, samples: number) =>
    `${hour} : ${label} en moyenne (${samples} relevé${samples > 1 ? "s" : ""})`,
  hourNoData: (hour: string) => `${hour} : pas encore de données`,
  now: "heure actuelle",
  calmLegend: "Créneau calme",
  chartTableCaption: "Affluence moyenne par heure",
  colHour: "Heure",
  colLevel: "Affluence moyenne",
  // Phase 5: forecast
  forecastCalm: (hour: string) => `Prévision : probablement calme vers ${hour}`,
  forecastNoCalm: (hour: string, label: string) =>
    `Prévision : pas de créneau calme dans les prochaines heures (le moins chargé : ${hour}, ${label.toLowerCase()})`,
  forecastBasis: (n: number) => `Estimation à partir de ${n.toLocaleString("fr-CA")} relevés`,
};

export type Messages = typeof fr;
