---
name: Affluence Gym
description: Two campus gyms face off on a daylight arena scoreboard; the crowd level is a giant numeral you compare in one glance.
colors:
  board: "#13213c"
  board-2: "#1d2f52"
  board-rule: "#31456d"
  on-board: "#f3f6f8"
  on-board-2: "#b4c1d4"
  lamp-off: "#2c3f66"
  blue: "#1f5faf"
  blue-board: "#4a86e0"
  on-blue: "#ffffff"
  red: "#c8102e"
  amber: "#e8a317"
  on-amber: "#13213c"
  ground: "#f3f6f8"
  ground-2: "#e3eaf1"
  ink: "#13213c"
  ink-2: "#48586f"
  bar: "#c3cedb"
  calm: "#13213c"
  ground-night: "#13213c"
  ground-2-night: "#1b2b4d"
  ink-night: "#eaf0f6"
  ink-2-night: "#a9b6c9"
  board-night: "#1d2e52"
  board-2-night: "#283d68"
  board-rule-night: "#3a5185"
  lamp-off-night: "#34497a"
  blue-night: "#6ea2e8"
  blue-board-night: "#5b92e5"
  red-night: "#ff5a6b"
  amber-night: "#f2b53a"
  bar-night: "#34497a"
  calm-night: "#eaf0f6"
typography:
  display:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "min(6rem, 24vw)"
    fontWeight: 700
    lineHeight: 0.9
    fontFeature: "tnum"
  headline:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.08em"
  title:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.04em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  body-small:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.06em"
rounded:
  corner: "14px"
  corner-s: "8px"
  tag: "4px"
  lamp: "3px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
components:
  scoreboard-column:
    backgroundColor: "{colors.board}"
    textColor: "{colors.on-board}"
    padding: "16px 16px 12px"
  report-button:
    backgroundColor: "{colors.board-2}"
    textColor: "{colors.on-board}"
    typography: "{typography.body}"
    rounded: "{rounded.corner-s}"
    height: "44px"
    width: "100%"
  picker-option:
    backgroundColor: "{colors.board-2}"
    textColor: "{colors.on-board}"
    rounded: "{rounded.corner-s}"
    padding: "0 12px"
    height: "44px"
  stamp:
    backgroundColor: "{colors.on-board}"
    textColor: "{colors.board}"
    rounded: "{rounded.corner-s}"
    padding: "8px 12px"
  quieter-tag:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "1px 8px"
  clock:
    backgroundColor: "{colors.board}"
    textColor: "{colors.on-board}"
    rounded: "6px"
    padding: "2px 8px"
  text-button:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 8px"
    height: "44px"
  tab:
    textColor: "{colors.ink-2}"
    padding: "0 16px"
    height: "44px"
  tab-selected:
    textColor: "{colors.ink}"
  banner:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.corner-s}"
    padding: "12px 16px"
  chart-bar:
    backgroundColor: "{colors.bar}"
    rounded: "3px 3px 0 0"
  chart-bar-calm:
    backgroundColor: "{colors.calm}"
  chart-bar-forecast:
    backgroundColor: "{colors.amber}"
  tabbar:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-2}"
    typography: "{typography.body-small}"
    height: "64px"
  tabbar-item-current:
    textColor: "{colors.ink}"
  tabbar-badge:
    backgroundColor: "{colors.board}"
    textColor: "{colors.on-board}"
    rounded: "{rounded.tag}"
    padding: "0 6px"
  live-card:
    backgroundColor: "{colors.board}"
    textColor: "{colors.on-board}"
    rounded: "{rounded.corner}"
    padding: "12px 16px"
  live-action:
    backgroundColor: "{colors.on-board}"
    textColor: "{colors.board}"
    rounded: "{rounded.corner-s}"
    padding: "0 16px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.corner-s}"
    padding: "0 16px"
    height: "48px"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.corner-s}"
    padding: "0 16px"
    height: "48px"
  list-row:
    textColor: "{colors.ink}"
    padding: "8px 0"
    height: "48px"
  setting-row:
    textColor: "{colors.ink}"
    height: "56px"
  segmented-option:
    textColor: "{colors.ink}"
    height: "44px"
    width: "48px"
  segmented-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  set-check:
    textColor: "{colors.ink}"
    rounded: "{rounded.corner-s}"
    size: "44px"
  set-check-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  input-field:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.corner-s}"
    padding: "0 12px"
    height: "44px"
  filter-chip:
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.corner-s}"
    padding: "0 12px"
    height: "44px"
  filter-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  confirm-panel:
    textColor: "{colors.ink}"
    rounded: "{rounded.corner-s}"
    padding: "16px"
  rest-strip:
    backgroundColor: "{colors.board}"
    textColor: "{colors.on-board}"
    rounded: "{rounded.corner}"
    padding: "8px 8px 8px 16px"
  broken-stamp:
    backgroundColor: "{colors.board}"
    textColor: "{colors.on-board}"
    rounded: "{rounded.tag}"
    padding: "2px 8px"
  alert-box:
    backgroundColor: "{colors.board}"
    textColor: "{colors.on-board}"
    rounded: "{rounded.corner-s}"
    padding: "12px 16px"
---

# Design System: Affluence Gym

## Overview

**Creative North Star: "The Daylight Arena Scoreboard"**

The two gyms face each other like two teams on a lit scoreboard hung over an ice rink. The crowd level is a giant condensed tabular numeral, one per column, read and compared in a single glance; everything else on the screen (label, lamps, evidence, report action) is subordinate to that pair of numbers. The world is built from the rink's own materials: an ice-white ground, navy boards, the blue line painted on the ice as the only structural rule, a thin centre-red line for "now", and one amber reserved for the best move.

Density is that of an operate tool, not a page: a single 32rem column, one framed board, then a "when to go today" strip below. Nothing decorates. There are no shadows, no gradients, no imagery, no decorative motion; state changes swap instantly and the only thing that moves is a clock that ticks. At night the arena keeps its colours: the ground becomes boards navy and the numerals stay ice, never black, never neon.

States are printed on the column itself rather than shown and withdrawn: a report stamps the column "Signalé" with a live wait clock, an unknown level shows an unlit digit, loading shows an unlit lamp-shaped placeholder. Every number carries its evidence line beneath it.

The workout, library and equipment screens sit in the same arena, one thumb away through a bottom tab bar ruled in blue. Anything live (a running workout, a rest countdown, an armed alert, a broken machine) is a lit navy board element on the ice; everything the user edits (sets, settings, search, filters) is drawn in slate lines and filled with ink when chosen.

**Key Characteristics:**
- Two-column scoreboard, columns split by a 2px blue line, framed with rounded boards (14px).
- One giant numeral per gym (6rem Barlow Condensed 700, tabular), above a caps label and four discrete lamps.
- Three text sizes only: 0.8125rem, 1rem, 6rem.
- Colour is reserved: blue is structure, red is now, amber is the best choice. Nothing else is coloured.
- Flat throughout; depth comes from the navy board sitting on the ice ground.
- Dark mode is the arena at night: navy ground, ice ink, the same reserved accents brightened.
- A fixed bottom tab bar (64px, 2px blue top rule) joins the scoreboard to the workout, library and equipment screens.

## Colors

A cold, two-material palette (ice and navy boards) with three tightly reserved signal colours painted on it, the way markings are painted on a rink.

### Primary
- **Boards Navy** (`board`): the scoreboard surface, the game clock, the ink of all text in daylight, and calm bars in the chart. It is the world's mass; navy, never black.
- **Raised Board** (`board-2`): the fill of controls that sit on the board (report button, picker options), one step lighter than the board so they read as fitted panels.
- **Board Seam** (`board-rule`): 1px outlines of controls on the board, and the colour of an unlit digit when there is no level.
- **Ice on Board** (`on-board`) / **Frosted Ice** (`on-board-2`): numerals, heads and lit lamps on the board; secondary evidence and prompts on the board.
- **Unlit Lamp** (`lamp-off`): the off state of the four level lamps and the loading digit placeholder.

### Secondary
- **Rink Blue Line** (`blue` on the ice ground, `blue-board` on the board): structure only. The 2px seam between the two gym columns (the board's background showing through a 2px gap), the 2px rule under the tab row, the 2px rule above opening hours, the 3px focus ring, and text selection. On the extended screens: the 2px rule along the top of the bottom tab bar, under block titles, above each exercise in a live workout, and above the exercise picker. Never a fill, never a button, never data.

### Tertiary
- **Best-Move Amber** (`amber`, text `on-amber`): the one reserved colour for the better choice. The "Plus calme" tag on the quieter gym, the calm-mark square before the next-calm answer, the forecast calm bar and its legend key. It appears only when the comparison is meaningful.
- **Centre-Ice Red** (`red`): "now" and nothing else. The 2px vertical now-line across the typical-day chart and its legend key.

### Neutral
- **Ice** (`ground`): the page ground in daylight; also the browser theme colour.
- **Frost** (`ground-2`): informational banners (demo data, server waking up).
- **Slate Ink** (`ink-2`): secondary prose, captions, chart axis and legend, unselected tabs.
- **Pale Bar** (`bar`): ordinary hours in the typical-day chart and the dashed baseline of hours without data.
- **Frost hairline** (`ground-2` as a 1px line): the divider under list rows, settings rows, picker items and machine rows; also the fill of a completed set's number fields.
- **Ink as fill** (`ink`, text `ground`): the chosen state of an editable control (primary button, selected segment, ticked set box, selected filter chip). Ink, not blue, is what a choice looks like.

Night values (`*-night` keys) replace the daylight tokens one for one under `prefers-color-scheme: dark`; `on-board`, `on-board-2` and `on-amber` keep their daylight values in both schemes.

### Named Rules
**The Painted Lines Rule.** Blue is structure only, red is "now" only, amber is the best move only. If an element is not a structural rule, the current time, or the recommended choice, it is navy, ice or slate.

**The One Amber Rule.** Amber marks at most one gym and one hour at a time. When the two gyms show the same level, or a level is missing, no gym gets the tag.

**The Night Arena Rule.** Dark mode raises the ground to boards navy and keeps numerals ice. No black surfaces, no neon accents.

**The Lit Board Rule.** Live and system state on the ice ground (running workout, rest timer, armed alert, "En cours" badge, a broken machine) is printed as a navy board element with ice text. A fault is a reversed stamp, never red or amber, because those colours are already spoken for.

## Typography

**Display Font:** Barlow Condensed 600/700 (self-hosted, latin subset; falls back to system-ui)
**Body Font:** system-ui (with -apple-system, Segoe UI, Roboto)

**Character:** A condensed, DIN-like scoreboard face for heads and numerals, set in caps with open tracking, against plain system text for every sentence. The display face speaks in names and numbers; the system face explains.

### Hierarchy
- **Display** (700, 6rem, line-height 0.9, tabular figures): the crowd-level numeral, one per gym column. Only this element uses the large size. It is capped at 24vw on narrow phones so a three-digit head count (official counter) fits its column; this is the same size step, not a new one.
- **Headline** (700, 1rem, 0.08em tracking, uppercase): the app name, gym names, and the "when to go today" section title.
- **Title** (600, 1rem, 0.04em tracking, uppercase): the level word under the numeral; the game clock (600, 0.04em, tabular, not uppercase).
- **Body** (400, 1rem, line-height 1.45): sentences, buttons, tabs (600), the next-calm answer (700), chart detail.
- **Body small** (400, 0.8125rem): evidence lines, banners, captions, axis, legend, opening hours, footer.
- **Label** (700, 0.8125rem, 0.06em tracking, uppercase): the amber "Plus calme" tag; the stamp title uses the same face at 1rem.

On the extended screens the same steps carry over: block and section titles are Headline; the live workout clock and rest countdown are condensed 700 at 1rem with tabular figures; set numbers, stepper values, row figures and step markers are condensed (600/700, tabular); tab bar labels are system 600 at 0.8125rem under a 22px icon; the "En cours" badge is condensed caps at 0.8125rem.

### Named Rules
**The Three Sizes Rule.** Only 0.8125rem, 1rem and 6rem exist. Hierarchy below the numeral comes from face, weight, case and colour, never from a fourth size.

**The Tabular Figures Rule.** Every number that can change (level, clock, wait clock, counts, axis, chart detail) is set with tabular figures so digits never jitter.

**The Two Voices Rule.** Barlow Condensed for names, numerals, labels and stamps; system text for every sentence. Prose is never set in the condensed face.

## Layout

A single mobile column, max-width 32rem, centred, with 16px side padding and safe-area insets top and bottom. The header (app name left, lit clock right) sits above optional banners, then the board, then the day section 32px below, then a centred footer 32px below that.

The board is a two-column equal grid with a 2px gap; both gyms must be visible without scrolling at 375px. Inside a column the content stacks: name and tag slot (fixed minimum height so both numerals share a baseline), numeral, label, lamps, a two-line evidence block (fixed minimum height), and the action pushed to the column foot. The layout does not change at wider viewports; the column simply stays capped at 32rem.

A fixed bottom tab bar (64px plus the bottom safe-area inset) spans the viewport with four equal items capped at 12rem each; the page column reserves its height plus 32px of bottom padding. During a workout the rest timer docks as a strip 8px above the tab bar, inset 16px, capped at 30rem, and the live workout card sticks 8px from the top. The extended screens stack their parts 16px apart; blocks open 16px down under a Headline title on a 2px blue rule. List rows are at least 48px, settings rows 56px, each closed by a 1px frost hairline. Destructive actions confirm inline in place, never in a modal.

Spacing follows a 4px base: 4, 8, 12, 16, 24, 32px (`s1` to `s6`). 12px separates elements within a column, 16px pads columns and banners, 24px opens the chart, 32px separates major sections. Every touch target is at least 44px tall.

## Elevation & Depth

The system is flat. No `box-shadow` is used for depth; the one shadow declaration in the build is an inset 3px ink line drawing the current tab's indicator at the top edge of the bottom tab bar, a painted line by another means. The fixed tab bar and docked rest strip overlap content without shadow: the 2px blue rule and the navy strip separate them. Depth is tonal and material: the navy board sits on the ice ground, raised controls on the board are one navy step lighter with a 1px seam, and the stamp reverses to an ice block on navy. The only animation is the loading pulse (opacity 0.16 to 0.08, 1.6s ease-in-out), and it is disabled under reduced motion.

### Named Rules
**The Painted Not Lifted Rule.** Surfaces are separated by colour and by painted lines, never by shadow or blur.

**The Instant State Rule.** State changes swap without transition; the ticking wait clock is the only motion that carries meaning.

The running workout clock and the rest countdown tick the same way, one step per second, and are the only other moving figures.

## Shapes

Rounded rink boards frame the scoreboard (14px); the only other elements with that radius are the free-standing board pieces of the workout screens, the live workout card and the docked rest strip. Fitted parts take 8px: controls on the board, banners, the stamp, the loading digit placeholder, and on the extended screens buttons, inputs, segmented controls, steppers, set check boxes, the inline confirm panel and the quiet-gym alert box. The "En cours" badge and the "En panne" stamp take the tag's 4px. Small indicators are near-square: tag 4px, lamps and bar tops 3px, legend keys and the calm-mark 2px. Lamps are 14px squares in a row with 6px gaps. Lines are drawn, not boxed: 2px blue rules, a 2px red now-line, a 1px slate chart baseline, a 2px dashed pale baseline for hours without data. The error banner is the only outlined container (2px ink border on transparent).

## Components

### Scoreboard Board and Columns
The signature component. A rounded (14px) grid of two navy columns whose 2px gap reveals the board-blue background as the blue line. Each column: gym name (headline), optional amber tag, numeral (display), level word (title), four lamps lit in ice up to the level, two evidence lines in frosted ice, then the action. A missing level shows a dash in the seam colour at weight 600 (unlit digit); loading shows an unlit 8px-rounded block that pulses.

### Buttons
- **Report button (primary action, deliberately secondary to the score):** full column width, 44px minimum, raised-board fill, 1px seam border, 8px corners, body text weight 600. Hover brightens the border to frosted ice.
- **Picker options:** the same fitted-panel treatment, a stack of four 44px rows with a tabular condensed digit and the level word; hover brightens the border to ice; disabled while sending (opacity 0.6, progress cursor).
- **Text button:** no fill, no border, underlined (3px offset), 44px tall; used for cancel and retry, with an optional 18px authored icon.
- **Focus:** a 3px blue outline at 2px offset everywhere; on the board the ring turns ice.

### Stamp
After a report the action slot becomes an ice block printed in reverse (navy text, 8px corners, 8px 12px padding): a 20px check icon, "Signalé" in the condensed caps face, and the remaining wait as a tabular mm:ss clock in small text.

### Chips (status tag)
- **Quieter tag:** amber fill, navy text, label typography, 4px corners, 1px 8px padding. Appears on one column at most, under the gym name.

### Language Switch
A quiet text control left of the game clock: the other language's code ("EN" or "FR") in Barlow Condensed 700, slate ink, no fill or border, 44px square tap target, ink on hover. Its accessible name is written in the target language and the button carries that `lang`.

### Game Clock
A small lit board element in the header: navy fill, ice text, condensed 600 tabular figures, 6px corners, 2px 8px padding.

### Banners
- **Info (demo data, waking server):** frost fill, small body text, 8px corners, 12px 16px padding.
- **Error (offline):** transparent with a 2px ink border, carrying a retry text button. Errors are ink, not red.

### Navigation (tabs)
Standard tabs over a 2px blue rule: 44px tall, 16px side padding, weight 600, slate when unselected; the selected tab turns ink with a 3px ink underline that overlaps the blue rule. Arrow keys move between tabs.

### Typical-Day Chart
A 96px bar strip, one button per opening hour, 2px gaps, 3px top corners, on a 1px slate baseline. Ordinary hours are pale bars, calm hours are navy (ink), the forecast calm hour is amber, hours without data are a dashed pale baseline. The selected hour gets a 2px ink outline at 2px offset; the current time is a 2px red line rising 6px above the strip. A tabular axis every three hours, a live detail line, a square-key legend, and a screen-reader table sit below. Opening hours close the section above a 2px blue rule.

### Bottom Tab Bar
Fixed to the bottom on the ice ground behind a 2px blue top rule: four items (scoreboard, workouts, library, equipment), each a 22px authored icon above a 0.8125rem system label at weight 600, slate when idle. The current item turns ink and gets a 3px ink line along its top edge (`aria-current="page"`). While a workout runs, the workouts item carries a small navy "En cours" badge (condensed caps, 4px corners) and links straight to the live workout.

### Live Workout Card
A lit board element (navy, 14px corners, 12px 16px padding): the workout name in frosted small text, the running clock below in condensed 700 tabular figures, and an ice action button (navy text, 8px corners, 44px) at the right. On the active workout screen it sticks to the top. Focus rings inside it turn ice.

### Rest Timer
A navy strip docked above the tab bar (14px corners): a label, the countdown in condensed 700 tabular figures, raised-board adjust buttons (-/+, 44px, 1px seam, 8px corners) and a skip button. When the rest is over the skip button reverses to ice with navy text.

### Buttons (extended screens)
- **Primary:** ink fill, ice-ground text, weight 700, 8px corners, 48px minimum, 16px side padding, optional 18px icon with an 8px gap. Hover: the fill deepens to the board navy.
- **Secondary:** transparent with a 1px slate border, ink text, same shape and size. Hover: the border takes the full ink. Nothing moves on hover.
- **Icon button:** 44px square, no fill, slate glyph that turns ink on hover.
- **Danger text button:** the existing text button in slate. Destructive actions are never red.

### Inline Confirmation
Destructive actions (discard a workout, delete a record) open an in-place panel instead of a modal: a 2px ink border, 8px corners, 16px padding, the question and a button row.

### Lists, Settings and Facts
- **Rows:** at least 48px, 8px vertical padding, a 1px frost hairline below; title in body text with a small slate subline; a right-aligned figure in condensed 600 tabular. Linked rows underline the title on hover.
- **Settings rows:** 56px, label left, control right.
- **Segmented control and stepper:** a 1px slate outline with 8px corners around 48 by 44px cells; the selected segment fills ink; the stepper value sits between in condensed 700 tabular.
- **Facts:** a two-column definition grid in small text, slate terms, ink values.
- **Steps:** a numbered list whose markers are condensed 700.

### Sets Table
Tabular figures throughout: condensed set numbers, 44px number inputs (1px slate outline, 8px corners), and a 44px check box (2px slate outline, 8px corners) that fills ink with an ice check when the set is done. A done row's inputs drop their outline and take a frost fill.

### Inputs / Fields
Search and number fields are 44px, transparent, 1px slate outline, 8px corners, ink text, slate placeholder; focus uses the standard 3px blue ring.

### Chips (filters)
Library filters: 1px slate outline, transparent, small text at weight 600, 12px side padding; the pressed chip fills ink with ice-ground text. 44px minimum height and 8px corners, like every other fitted control (no pill shape in the system).

### Equipment Status
Machine rows carry their status right-aligned in small slate text. A broken machine is stamped in reverse instead: navy fill, ice text, weight 600, 4px corners, 2px 8px padding ("En panne").

### Quiet-Gym Alert
Unarmed, it is a secondary button with a slate privacy note. Armed, it becomes a navy board box (8px corners, 12px 16px padding) with ice text and an ice-focused text button to cancel.

### Screen Mode (entrance TV)
The scoreboard alone, full viewport, for reading across a room. Same board, columns, lamps, amber "Plus calme" tag and demo banner; no header bar, tabs, report buttons or footer line. The three text sizes stay three but scale with the screen height (small max(0.8125rem, 2.4vh), body max(1rem, 3.4vh), score min(30vh, 19vw)). Landscape: the two columns fill the height between the title row and a footer row (QR code, freshness line, discreet exit link). Portrait: the columns stack at content height and the page scrolls. The QR code is drawn as an SVG path, navy modules on a white ground in both themes, because phone cameras read dark-on-light reliably.

### Week Grid (typical week)
A real table: weekday abbreviations across (today in ink, bold), hours down (right-aligned, small slate). Cells 22px tall with 2px gaps and 3px corners. Busier is darker: four steps of ink mixed into the ground (12%, 32%, 58%, 88%), so the ramp inverts correctly at night. Closed hours stay blank; open hours without data get a dashed hairline. One amber inset frame marks the week's quietest slot (the only amber, the best choice); a 2px red frame marks the current hour (red is "now"). Summary lines above, legend below.

### Progress Chart
Above the session list on an exercise screen: a value line (current estimated 1RM in bold, change and workout count in small slate), then a 112px plot: one 2px ink line on a slate hairline base, 8px round dots (open, ground-filled; the latest one filled with ink), start and end dates under the axis. No colour beyond ink: progress is not "now" and not "the best choice".

### Exercise Illustrations
Stick figures drawn from joint angles: one proportion set for every exercise, side view facing right (front view only for the lateral raise). Head and near limbs in ink (torso 4.2, limbs 3.2, round caps), far limbs at 40 % opacity, equipment in slate (2.5, plates filled slate), on a ground-2 panel with 8px corners. The exercise screen shows two panels captioned with an ink-disc step number (1 Départ, 2 Arrivée); lists use the finish pose as a 48 × 44 thumbnail. No colour beyond the ink ramp: they invert at night with the tokens.

### Icons
Authored inline SVG on a 24-unit grid with 2-unit round strokes in currentColor (check 20px, retry 18px). No icon font, no glyph icons. The set now includes board, dumbbell, book and wrench at 22px for the tab bar, and plus, minus, trash, back and bell at 18px inside buttons.

## Do's and Don'ts

### Do:
- **Do** keep both gyms on one board, side by side, split by the 2px blue line, visible without scrolling at 375px.
- **Do** set every changing number in tabular figures, and the level numeral at 6rem Barlow Condensed 700.
- **Do** pair every number with its evidence line (report count, freshness, sample count), and write the level as a word under the numeral.
- **Do** print states onto the column (stamp, unlit digit, unlit lamps) instead of transient toasts.
- **Do** keep touch targets at 44px minimum and the focus ring at 3px blue, 2px offset (ice on the board).
- **Do** move dark mode to boards navy ground with ice ink, swapping each token for its `-night` value.
- **Do** print live state (running workout, rest timer, armed alert, broken machine) as a navy board element with ice text.
- **Do** show a chosen or completed control as an ink fill on the ice, and editable controls as 1px slate outlines with 8px corners.
- **Do** confirm destructive actions inline, in a 2px ink-outlined panel where the action was.

### Don't:
- **Don't** use blue as a fill, a button colour, or a data colour; it is the painted structural line only.
- **Don't** use red for errors, alerts or warnings; red marks "now" only, and errors are drawn in ink.
- **Don't** spend amber on anything but the single best choice (quieter gym, next calm hour).
- **Don't** add a fourth text size, shadows, gradients, or decorative motion.
- **Don't** use black or neon surfaces in either scheme, or the fitness-app neon-on-black look.
- **Don't** set sentences in Barlow Condensed, or numerals in the system face.
- **Don't** open modals for confirmation, or colour faults and destructive actions red or amber.
