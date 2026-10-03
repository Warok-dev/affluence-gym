---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: ["frontend/src/components/GymColumn.tsx","frontend/src/components/DayPanel.tsx","frontend/src/components/TypicalDay.tsx","frontend/src/styles.css"]
---

# Surface: home screen (mobile PWA)

Mode: Operate. Audience: students deciding, usually in the evening before leaving home, whether and where to train. Job: compare the two gyms now, then see when it will be calm today; secondary job: report the level in one tap at the gym. Constraints: both gyms visible without scrolling at 375 px; every state designed (loading, server waking up, offline, no data, closed, not enough history, cooldown, send failure); no fitness-app neon, no institutional look; French UI with i18n.

## Direction contract

THESIS: The two gyms face each other like two teams on a daylight arena scoreboard: the level is a giant tabular numeral you compare in one glance. Refuses the category default of stacked status cards with colored pills and a big blue button.

OWN-WORLD: Ice-white ground, boards-navy ink, rink blue-line rules (2 px) as the only structure, a thin centre-red line reserved for "now", one amber reserved for the best move (quieter gym, next calm hour). Condensed DIN-like caps for heads and numerals, system text for prose, tabular figures, three sizes only. Dark mode is the arena at night: navy boards ground, ice numerals, never black or neon.

STORY: The student sees "Minto 4 Bondé | Montpetit 2 Calme", the amber tag says which to pick, the day strip says when it calms down; they report in one tap and the column stamps "Signalé" with the remaining wait.

FIRST VIEWPORT: Header (name, clock). One framed board, two columns split by a blue line: gym name, giant numeral, label, 4-lamp row, evidence line, report button. Below: gym switch, next-calm line in amber, typical-day bars with the red now-line.

FORM: arena scoreboard, position 6 on the ordered list, seed key 6f4afee9.
Roll output (verbatim first lines): "DIRECTION CONCEPT SEED (key: 6f4afee9; mode: operate; source: api; approved pool: c3b204a1eed6; 306/564 human-approved ...)" then "ASSIGNED INDEX: 6". Ordered list: 1 departure board, 2 hourly weather strip, 3 Aicher 1972 sports identity, 4 ski-lift status board, 5 residence laundry sign-up sheet, 6 arena scoreboard, 7 popular-times bars (rut).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: after a report, the gym's column stamps "Signalé" and shows a live mm:ss wait clock until the next report is allowed.
Motion grammar: none decorative; state changes swap instantly, the wait clock ticks, reduced motion changes nothing essential.

Finish-review fixes (round 1): red reserved for "now" (error banner in ink); dark ground raised to boards navy; hour words share the backend calm threshold; demo-data banner; 2px blue structure lines; calm bars in ink so blue stays structure; prose in system text; report button demoted; numeral 6rem, discrete lamps, lit clock, reversed stamp.

Raises (from declined challengers): one reserved colour for the best choice (orienteering); states stamped on the column, never vanishing toasts (ticket wallet); tabular figures everywhere (datamatics); three text sizes (lexicon); every number carries its evidence (monochrome).
