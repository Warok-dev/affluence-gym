const timeFr = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
};

export const fr = {
  appTitle: "Affluence Gym",
  levels: { 1: "Vide", 2: "Calme", 3: "Modéré", 4: "Bondé" },
  noData: "Pas de données",
  loading: "Chargement…",
  unavailable: "Indisponible",
  footer: "Application étudiante non officielle · aucune donnée personnelle collectée",

  // Header and connection
  clockLabel: (time: string) => `Il est ${time}`,
  waking: "Le serveur se réveille, ça peut prendre jusqu'à une minute…",
  offline: "Impossible de joindre le serveur.",
  offlineSince: (ago: string) => `Valeurs affichées : ${ago}.`,
  retry: "Réessayer",
  demoData: "Données de démonstration : tous les chiffres affichés sont fictifs.",

  // Scoreboard
  boardLabel: "Affluence en ce moment",
  quieter: "Plus calme",
  closed: "Fermé",
  reportsCount: (n: number) => (n <= 1 ? `${n} signalement` : `${n} signalements`),
  justNow: "à l'instant",
  minutesAgo: (m: number) => `il y a ${m} min`,
  lastReport: (ago: string) => `dernier ${ago}`,
  noReports: "Aucun signalement depuis 30 min",
  beFirst: "Sois le premier à signaler",
  todayHours: (open: string, close: string) => `Aujourd'hui ${open} – ${close}`,

  // Reporting
  reportButton: "Signaler",
  reportButtonFor: (gym: string) => `Signaler l'affluence à ${gym}`,
  cancel: "Annuler",
  reportPrompt: "Combien de monde ?",
  reportLevel: (label: string) => `Signaler : ${label}`,
  sending: "Envoi…",
  reported: "Signalé",
  success: "Merci ! Ton signalement est enregistré.",
  nextReportIn: (clock: string) => `Prochain dans ${clock}`,
  nextReportInLong: (clock: string) => `Prochain signalement possible dans ${clock}`,
  cooldown: "Tu as déjà signalé cette salle il y a moins de 15 min. Réessaie un peu plus tard.",
  sendError: "Échec de l'envoi. Vérifie ta connexion et réessaie.",

  // Day panel
  dayTitle: "Quand y aller aujourd'hui",
  time: timeFr,
  hour: (h: number) => `${h} h`,
  openToday: (open: string, close: string) => `Ouvert aujourd'hui de ${open} à ${close}`,
  closedToday: "Fermé aujourd'hui",
  closedNow: "Fermé en ce moment",
  typicalDay: "Affluence typique aujourd'hui",
  loadingHistory: "Chargement de l'historique…",
  historyUnavailable: "Historique indisponible pour le moment. Il revient au prochain rafraîchissement.",
  notEnoughHistory: "Pas encore assez d'historique pour ce jour de la semaine.",
  calmLater: (hours: string) => `Plutôt calme plus tard vers ${hours}`,
  noCalmLater: "Aucun créneau calme connu pour le reste de la journée.",
  historyBasis: (weeks: number) => `Moyenne des ${weeks} dernières semaines`,
  forecastCalm: (hour: string) => `Calme prévu vers ${hour}`,
  forecastCalmTomorrow: (hour: string) => `Calme prévu demain vers ${hour}`,
  forecastNoCalm: (hour: string, label: string) =>
    `Pas de créneau calme prévu ; le moins chargé : ${hour} (${label.toLowerCase()})`,
  forecastBasis: (n: number) => `Prévision établie sur ${n.toLocaleString("fr-CA")} relevés`,
  list: (items: string[]) => new Intl.ListFormat("fr", { type: "conjunction" }).format(items),
  hourDetail: (hour: string, label: string, samples: number) =>
    `${hour} : ${label} en moyenne (${samples} relevé${samples > 1 ? "s" : ""})`,
  hourNoData: (hour: string) => `${hour} : pas encore de données`,
  calmLegend: "Créneau calme",
  forecastLegend: "Calme prévu",
  nowLegend: "Maintenant",
  chartTableCaption: "Affluence moyenne par heure",
  colHour: "Heure",
  colLevel: "Affluence moyenne",
};

export type Messages = typeof fr;
