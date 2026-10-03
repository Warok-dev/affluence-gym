# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University students who train at the campus gyms (two facilities: Minto and Montpetit). Main scene, confirmed: **before leaving** home or residence, often in the evening, they take a quick look to decide whether it is worth going now or later, and which gym. Secondary scene: at the gym, reporting how busy it is in one tap.

## Product Purpose

Show, in real time, how many people are in each campus gym, so students pick the best moment and place to train. The target is the **exact head count** from the turnstiles (card scan to enter, free exit turnstile): people present = entries − exits, from aggregated counters the university would provide (pending agreement; a demo with simulated counters is prepared for Sports Services). Success: a student knows within seconds which gym is quieter right now, and when it will probably be calm today.

Scope widened (confirmed 2026-10-02) to a complete gym companion: workout logging, exercise library and programs, equipment status, notifications. Personal workout data stays **on the device**, never on the server.

## Positioning

Today, crowd levels come from anonymous reports by students; the app is built to switch to the turnstile counters (aggregates only, never identities) as soon as the university provides them, and falls back to reports when the counter is silent. Complemented by the typical day and a forecast model. It is a student-made, unofficial tool, not a university service.

## Operating Context

- Mobile-first PWA, installable; used one-handed on a phone, often at home in the evening (light or dark mode).
- The first thing read must be the **comparison of the two gyms' current level, both visible without scrolling**.
- Data refreshes every 45 s; the typical day and forecast change slowly.
- Hours and dates are those of the gyms' time zone (America/Toronto).

## Capabilities and Constraints

- Levels: 1 Vide, 2 Calme, 3 Modéré, 4 Bondé; or no data. One report per person per gym every 15 min (anonymous client id).
- Per gym: current level, number of recent reports, time of last report, opening hours today, typical crowd per hour today (history), forecast for the next hours with the next calm slot.
- UI language French; English dictionary ready (i18n).
- States that must be designed: loading, no data yet, API unreachable, not enough history, closed today / closed now, cooldown after a report, send failure.
- Opening hours and exam dates are provisional values to be checked.

## Brand Commitments

- Name: "Affluence Gym". No university logo, name or official branding: the app is not official.
- Must not look like a fitness app (neon, black and fluo, motivational tone) nor like an institutional/administrative university site.

## Evidence on Hand

- No real usage data yet: demo data in `backend/demo.db` is synthetic and must never be presented as real.
- No testimonials, partners or official endorsement exist; none may be implied.

## Product Principles

1. The answer before the action: what students came for (how busy, where, when) outranks the report button.
2. Both gyms at a glance: comparison is the core job, never hidden behind scrolling or tabs.
3. Honest data: say how much evidence stands behind a number (reports, samples), and say clearly when there is none.
4. Privacy by design: no account, no personal data, no tracking.

## Accessibility & Inclusion

Color is never the only carrier of a level (always written out); readable contrast in light and dark modes; touch targets of at least 44 px; screen-reader alternative for charts.
