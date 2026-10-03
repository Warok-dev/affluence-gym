// English versions of the workout content (exercise names, guides, programs, machine names).
// Same ids as the French originals; anything missing here falls back to French.

import type { ExerciseGuide } from "./guide";

export const EXERCISE_NAMES_EN: Record<string, string> = {
  "bench-press": "Bench press",
  "incline-dumbbell-press": "Incline dumbbell press",
  "chest-fly-machine": "Machine chest fly",
  "push-up": "Push-ups",
  dips: "Dips",
  deadlift: "Deadlift",
  "pull-up": "Pull-ups",
  "lat-pulldown": "Lat pulldown",
  "barbell-row": "Barbell row",
  "seated-cable-row": "Seated cable row",
  "back-squat": "Squat",
  "leg-press": "Leg press",
  "romanian-deadlift": "Romanian deadlift",
  "walking-lunge": "Walking lunges",
  "leg-curl": "Leg curl",
  "leg-extension": "Leg extension",
  "calf-raise": "Standing calf raise",
  "hip-thrust": "Hip thrust",
  "overhead-press": "Overhead press",
  "dumbbell-shoulder-press": "Dumbbell shoulder press",
  "lateral-raise": "Lateral raises",
  "face-pull": "Face pull",
  "barbell-curl": "Barbell curl",
  "dumbbell-curl": "Dumbbell curl",
  "hammer-curl": "Hammer curl",
  "triceps-pushdown": "Triceps pushdown",
  "skull-crusher": "Skull crusher",
  plank: "Plank (seconds)",
  crunch: "Crunch",
  "hanging-leg-raise": "Hanging leg raise",
  "rowing-machine": "Rowing machine (minutes)",
  treadmill: "Treadmill (minutes)",
  bike: "Bike (minutes)",
};

export const GUIDES_EN: Record<string, ExerciseGuide> = {
  "bench-press": {
    muscles: "Chest, triceps, front of the shoulders",
    equipment: "Barbell and flat bench",
    steps: [
      "Lie down with your eyes under the bar and your feet flat on the floor.",
      "Squeeze your shoulder blades together and grip the bar a little wider than your shoulders.",
      "Lower the bar to the bottom of your chest, elbows at about 45° from your body.",
      "Press the bar back up, keeping your hips on the bench.",
    ],
    tip: "Don't bounce the bar off your chest. With a heavy load, ask someone to spot you.",
  },
  "incline-dumbbell-press": {
    muscles: "Upper chest, shoulders, triceps",
    equipment: "Dumbbells and incline bench (30 to 45°)",
    steps: [
      "Sit on the incline bench with a dumbbell in each hand at shoulder height.",
      "Press the dumbbells above your chest, bringing them slightly together.",
      "Lower them slowly until you feel a stretch in your chest.",
    ],
    tip: "Keep your wrists straight, stacked above your elbows.",
  },
  "chest-fly-machine": {
    muscles: "Chest",
    equipment: "Chest fly machine (pec deck)",
    steps: [
      "Adjust the seat so the handles are at chest height.",
      "Bring your arms together in front of you with your elbows slightly bent.",
      "Return slowly without letting the weights slam.",
    ],
    tip: "The movement comes from your chest: don't push with your hands.",
  },
  "push-up": {
    muscles: "Chest, triceps, core",
    equipment: "None",
    steps: [
      "Hands on the floor a little wider than your shoulders, body straight from head to heels.",
      "Lower your chest close to the floor, elbows at about 45°.",
      "Push back up to straight arms.",
    ],
    tip: "Don't let your hips sag. Too hard? Do them on your knees or with your hands on a bench.",
  },
  dips: {
    muscles: "Chest, triceps, shoulders",
    equipment: "Parallel bars",
    steps: [
      "Support yourself on the bars with straight arms and low shoulders.",
      "Lower yourself by bending your elbows to about 90°.",
      "Push on the bars to come back up.",
    ],
    tip: "Don't go lower than your shoulders tolerate without pain.",
  },
  deadlift: {
    muscles: "Hamstrings, glutes, back",
    equipment: "Barbell",
    steps: [
      "Feet hip-width apart, bar over the middle of your feet.",
      "Hinge at the hips, grab the bar, back flat, chest up.",
      "Push through the floor and stand up, keeping the bar close to your legs.",
      "Lower it by pushing your hips back first.",
    ],
    tip: "Your back must never round. Start light and get the technique right before adding load.",
  },
  "pull-up": {
    muscles: "Back (lats), biceps",
    equipment: "Pull-up bar",
    steps: [
      "Hang with your hands a little wider than your shoulders, palms facing forward.",
      "Drive your elbows down until your chin clears the bar.",
      "Lower yourself to straight arms, without swinging.",
    ],
    tip: "Can't do a full pull-up yet? Use a band or the assisted machine.",
  },
  "lat-pulldown": {
    muscles: "Back (lats), biceps",
    equipment: "High pulley",
    steps: [
      "Sit with your thighs locked in, hands wide on the bar.",
      "Pull the bar to your upper chest, drawing your shoulders down.",
      "Let it rise slowly back to straight arms.",
    ],
    tip: "Don't lean back to cheat: your torso stays almost upright.",
  },
  "barbell-row": {
    muscles: "Upper back, lats, biceps",
    equipment: "Barbell",
    steps: [
      "Lean your torso forward, back flat, knees slightly bent.",
      "Pull the bar toward your lower stomach, squeezing your shoulder blades.",
      "Lower it under control.",
    ],
    tip: "Keep your back still: if your torso rises on every rep, go lighter.",
  },
  "seated-cable-row": {
    muscles: "Upper back, lats, biceps",
    equipment: "Low pulley",
    steps: [
      "Sit with your feet on the footrests and your back straight.",
      "Pull the handle to your stomach, squeezing your shoulder blades.",
      "Return to straight arms, letting your shoulders come forward a little.",
    ],
    tip: "Don't rock your torso back and forth.",
  },
  "back-squat": {
    muscles: "Thighs (quads), glutes",
    equipment: "Barbell and rack",
    steps: [
      "Bar on your upper back, feet shoulder-width apart, toes turned slightly out.",
      "Sit down by pushing your hips back, knees tracking over your feet.",
      "Go at least to parallel thighs if your mobility allows it.",
      "Stand back up, pushing through your whole foot.",
    ],
    tip: "Set the rack's safety bars just below your lowest point.",
  },
  "leg-press": {
    muscles: "Thighs, glutes",
    equipment: "Leg press",
    steps: [
      "Back and hips against the backrest, feet shoulder-width apart on the platform.",
      "Lower the platform until your knees reach about 90°.",
      "Push without fully locking your knees at the top.",
    ],
    tip: "Your lower back must not lift off the backrest at the bottom.",
  },
  "romanian-deadlift": {
    muscles: "Hamstrings, glutes",
    equipment: "Barbell or dumbbells",
    steps: [
      "Stand holding the bar, knees slightly bent.",
      "Push your hips back, sliding the bar down along your thighs.",
      "Go down until you feel a stretch behind your thighs, then come back up.",
    ],
    tip: "Back flat the whole time: the range ends where your back would start to round.",
  },
  "walking-lunge": {
    muscles: "Thighs, glutes",
    equipment: "None or dumbbells",
    steps: [
      "Take a big step forward.",
      "Lower yourself until your back knee almost touches the floor.",
      "Push off your front leg and continue with the other leg.",
    ],
    tip: "Your front knee stays in line with your foot, without caving in.",
  },
  "leg-curl": {
    muscles: "Hamstrings",
    equipment: "Leg curl machine",
    steps: [
      "Set the pad just above your heels.",
      "Bend your knees to bring your heels toward your glutes.",
      "Return slowly.",
    ],
    tip: "Your hips stay down: if they lift, the weight is too heavy.",
  },
  "leg-extension": {
    muscles: "Thighs (quads)",
    equipment: "Leg extension machine",
    steps: [
      "Sit with your knees lined up with the machine's pivot.",
      "Straighten your legs until they are horizontal.",
      "Lower under control.",
    ],
    tip: "Avoid jerking at the top of the movement.",
  },
  "calf-raise": {
    muscles: "Calves",
    equipment: "Machine or step",
    steps: [
      "Balls of your feet on the edge, heels hanging off.",
      "Rise onto your toes as high as you can.",
      "Lower slowly below the level of the edge.",
    ],
    tip: "Pause briefly at the top and bottom: no bouncing.",
  },
  "hip-thrust": {
    muscles: "Glutes, hamstrings",
    equipment: "Barbell and bench",
    steps: [
      "Upper back against a bench, bar across your hips (with a pad).",
      "Feet flat, drive your hips up until your shoulders and knees line up.",
      "Squeeze your glutes at the top, then lower.",
    ],
    tip: "Chin tucked, ribs down: don't arch your lower back at the top.",
  },
  "overhead-press": {
    muscles: "Shoulders, triceps",
    equipment: "Barbell",
    steps: [
      "Stand with the bar in front of your shoulders, hands a little wider than shoulder-width.",
      "Brace your glutes and stomach, press the bar overhead.",
      "Move your head slightly under the bar at the top, then lower it.",
    ],
    tip: "Don't arch your back to press: if it does, go lighter.",
  },
  "dumbbell-shoulder-press": {
    muscles: "Shoulders, triceps",
    equipment: "Dumbbells, bench with backrest",
    steps: [
      "Sit with your back straight, dumbbells at ear height.",
      "Press up without letting the dumbbells touch.",
      "Lower them slowly.",
    ],
    tip: "Keep your forearms vertical.",
  },
  "lateral-raise": {
    muscles: "Side of the shoulders",
    equipment: "Dumbbells",
    steps: [
      "Stand with the dumbbells at your sides, elbows slightly bent.",
      "Raise your arms out to the sides up to shoulder height.",
      "Lower them slowly.",
    ],
    tip: "A light weight and a clean movement beat swinging.",
  },
  "face-pull": {
    muscles: "Rear shoulders, upper back",
    equipment: "High pulley and rope",
    steps: [
      "Rope at face height, step back to put tension on the cable.",
      "Pull the rope toward your forehead, spreading your hands apart.",
      "Return to straight arms.",
    ],
    tip: "Elbows high, at shoulder level or above.",
  },
  "barbell-curl": {
    muscles: "Biceps",
    equipment: "Barbell",
    steps: [
      "Stand holding the bar palms forward, elbows close to your body.",
      "Bend your elbows to bring the bar up toward your shoulders.",
      "Lower it all the way.",
    ],
    tip: "Your elbows stay still: no swinging your torso.",
  },
  "dumbbell-curl": {
    muscles: "Biceps",
    equipment: "Dumbbells",
    steps: [
      "Dumbbells at your sides, palms facing forward.",
      "Curl them up, keeping your elbows against your body.",
      "Lower them slowly.",
    ],
    tip: "You can alternate left and right arm to focus better.",
  },
  "hammer-curl": {
    muscles: "Biceps, forearms",
    equipment: "Dumbbells",
    steps: [
      "Dumbbells at your sides, palms facing each other.",
      "Curl up keeping this neutral grip.",
      "Lower under control.",
    ],
    tip: "Your wrists stay straight.",
  },
  "triceps-pushdown": {
    muscles: "Triceps",
    equipment: "High pulley",
    steps: [
      "Face the pulley, elbows against your body.",
      "Push the bar or rope down to straight arms.",
      "Let it rise until your forearms pass horizontal.",
    ],
    tip: "Only your forearms move.",
  },
  "skull-crusher": {
    muscles: "Triceps",
    equipment: "EZ bar and bench",
    steps: [
      "Lying down, hold the bar with straight arms above your chest.",
      "Bend your elbows to lower the bar toward your forehead.",
      "Straighten your arms to come back.",
    ],
    tip: "Your elbows point at the ceiling and don't flare out.",
  },
  plank: {
    muscles: "Core (abs, back)",
    equipment: "None",
    steps: [
      "Rest on your forearms and toes.",
      "Body straight, glutes and stomach tight.",
      "Hold the position; log the seconds as reps.",
    ],
    tip: "Breathe normally and stop as soon as your hips drop.",
  },
  crunch: {
    muscles: "Abs",
    equipment: "None",
    steps: [
      "Lie down, knees bent, feet on the floor.",
      "Curl your upper back to lift your shoulders.",
      "Lower slowly.",
    ],
    tip: "Don't pull on your neck with your hands.",
  },
  "hanging-leg-raise": {
    muscles: "Abs, hip flexors",
    equipment: "Pull-up bar",
    steps: [
      "Hang with straight arms.",
      "Raise your knees (or straight legs) toward your chest.",
      "Lower them without swinging.",
    ],
    tip: "Start with bent knees, then straighten your legs when it gets easy.",
  },
  "rowing-machine": {
    muscles: "Cardio, legs, back",
    equipment: "Rowing machine",
    steps: [
      "Push with your legs first, then swing your torso back, then pull with your arms.",
      "Return in reverse order: arms, torso, legs.",
      "Log the minutes as reps.",
    ],
    tip: "The power comes from your legs: don't just pull with your arms.",
  },
  treadmill: {
    muscles: "Cardio",
    equipment: "Treadmill",
    steps: ["Start with a few minutes of walking.", "Increase the speed gradually.", "Log the minutes."],
    tip: "Avoid holding on to the handrails while running.",
  },
  bike: {
    muscles: "Cardio, legs",
    equipment: "Stationary bike",
    steps: [
      "Set the saddle so your leg is almost straight at the bottom of the stroke.",
      "Pedal at a steady pace.",
      "Log the minutes.",
    ],
    tip: "Moderate resistance is easier on the knees.",
  },
};

export interface ProgramText {
  name: string;
  level: string;
  frequency: string;
  summary: string;
  days: Record<string, string>;
}

export const PROGRAMS_EN: Record<string, ProgramText> = {
  "debutant-full-body": {
    name: "Beginner: full body",
    level: "Beginner",
    frequency: "3 workouts a week, alternating A and B",
    summary:
      "To get to know the gym: simple exercises, mostly machines, working the whole body every workout.",
    days: { a: "Workout A", b: "Workout B" },
  },
  "force-5x5": {
    name: "Strength: 5 × 5",
    level: "Intermediate",
    frequency: "3 workouts a week, alternating A and B",
    summary:
      "Few exercises, heavy basic lifts for 5 sets of 5. Add a little weight every workout as long as the technique stays clean.",
    days: { a: "Workout A", b: "Workout B" },
  },
  "haut-bas": {
    name: "Upper / lower body",
    level: "Intermediate",
    frequency: "4 workouts a week: upper, lower, rest, upper, lower",
    summary: "Upper and lower body on separate days, with more volume per muscle group.",
    days: { "haut-1": "Upper 1", "bas-1": "Lower 1", "haut-2": "Upper 2", "bas-2": "Lower 2" },
  },
  "poids-du-corps": {
    name: "Bodyweight",
    level: "All levels",
    frequency: "2 to 3 workouts a week",
    summary: "No weights: when the gym is packed, all you need is a free corner and a pull-up bar.",
    days: { a: "Single workout" },
  },
};

/** Machine names by id prefix ("treadmill-3" -> "Treadmill"); the API serves French names. */
export const MACHINE_NAMES_EN: Record<string, string> = {
  treadmill: "Treadmill",
  bike: "Bike",
  rower: "Rowing machine",
  elliptical: "Elliptical",
  "squat-rack": "Squat rack",
  bench: "Flat bench",
  cable: "Dual cable machine",
  "leg-press": "Leg press",
  "lat-pulldown": "Lat pulldown",
  "leg-curl": "Leg curl",
};
