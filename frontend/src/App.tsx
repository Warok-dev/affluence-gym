import { useEffect, useState } from "react";
import { TabBar } from "./components/TabBar";
import { TIMEZONE } from "./config";
import { useT } from "./i18n";
import { ROUTES, useRoute } from "./router";
import { ActiveWorkoutScreen } from "./screens/ActiveWorkoutScreen";
import { ExerciseDetailScreen } from "./screens/ExerciseDetailScreen";
import { ExercisesScreen } from "./screens/ExercisesScreen";
import { OccupancyScreen } from "./screens/OccupancyScreen";
import { ProgramScreen } from "./screens/ProgramScreen";
import { WorkoutDetailScreen } from "./screens/WorkoutDetailScreen";
import { WorkoutsScreen } from "./screens/WorkoutsScreen";
import { localTime } from "./time";
import { useWorkouts, WorkoutsProvider } from "./workouts/WorkoutsContext";

export function App() {
  return (
    <WorkoutsProvider>
      <Shell />
    </WorkoutsProvider>
  );
}

function Shell() {
  const t = useT();
  const route = useRoute();
  const { active } = useWorkouts();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(clock);
  }, []);

  const clock = localTime(now, TIMEZONE);
  const clockText = t.time(`${clock.hour}:${String(clock.minute).padStart(2, "0")}`);

  let screen;
  if (route === ROUTES.workouts) screen = <WorkoutsScreen />;
  else if (route === ROUTES.activeWorkout) screen = <ActiveWorkoutScreen />;
  else if (route.startsWith(`${ROUTES.workouts}/`))
    screen = <WorkoutDetailScreen id={decodeURIComponent(route.slice(ROUTES.workouts.length + 1))} />;
  else if (route === ROUTES.exercises) screen = <ExercisesScreen />;
  else if (route.startsWith(`${ROUTES.exercises}/`))
    screen = <ExerciseDetailScreen id={decodeURIComponent(route.slice(ROUTES.exercises.length + 1))} />;
  else if (route.startsWith("/programmes/"))
    screen = <ProgramScreen id={decodeURIComponent(route.slice("/programmes/".length))} />;
  else screen = <OccupancyScreen />;

  return (
    <>
      <header className="app-header">
        <h1>{t.appTitle}</h1>
        <time className="clock" aria-label={t.clockLabel(clockText)}>
          {clockText}
        </time>
      </header>
      <main>{screen}</main>
      <footer className="app-footer">{t.footer}</footer>
      <TabBar route={route} workoutInProgress={active !== null} />
    </>
  );
}
