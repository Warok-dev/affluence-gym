import { useEffect, useState } from "react";
import { TabBar } from "./components/TabBar";
import { TIMEZONE } from "./config";
import { useT } from "./i18n";
import { ROUTES, useRoute } from "./router";
import { ActiveWorkoutScreen } from "./screens/ActiveWorkoutScreen";
import { OccupancyScreen } from "./screens/OccupancyScreen";
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
