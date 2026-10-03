import { useEffect, useState } from "react";
import { TabBar } from "./components/TabBar";
import { FACILITIES, TIMEZONE } from "./config";
import { useLocale, useT } from "./i18n";
import { ROUTES, useRoute } from "./router";
import { AboutScreen } from "./screens/AboutScreen";
import { ActiveWorkoutScreen } from "./screens/ActiveWorkoutScreen";
import { EquipmentScreen } from "./screens/EquipmentScreen";
import { ExerciseDetailScreen } from "./screens/ExerciseDetailScreen";
import { ExercisesScreen } from "./screens/ExercisesScreen";
import { KioskScreen } from "./screens/KioskScreen";
import { TrendsScreen } from "./screens/TrendsScreen";
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
  const { locale, setLocale } = useLocale();
  const otherLocale = locale === "fr" ? "en" : "fr";
  const route = useRoute();
  const { active } = useWorkouts();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(clock);
  }, []);

  const clock = localTime(now, TIMEZONE);
  const clockText = t.time(`${clock.hour}:${String(clock.minute).padStart(2, "0")}`);

  // Screen mode replaces the whole shell: no header, tabs or footer on the entrance TV.
  if (route === ROUTES.kiosk) return <KioskScreen />;

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
  else if (route === ROUTES.equipment) screen = <EquipmentScreen />;
  else if (route.startsWith("/tendances")) {
    const id = decodeURIComponent(route.slice("/tendances/".length));
    const gym = FACILITIES.find((f) => f.id === id)?.id ?? FACILITIES[0].id;
    screen = <TrendsScreen gym={gym} />;
  } else if (route === ROUTES.about) screen = <AboutScreen />;
  else screen = <OccupancyScreen />;

  return (
    <>
      <header className="app-header">
        <h1>{t.appTitle}</h1>
        <div className="header-tools">
          <button
            type="button"
            className="lang-switch"
            lang={otherLocale}
            aria-label={t.switchLanguage}
            onClick={() => setLocale(otherLocale)}
          >
            {otherLocale.toUpperCase()}
          </button>
          <time className="clock" aria-label={t.clockLabel(clockText)}>
            {clockText}
          </time>
        </div>
      </header>
      <main>{screen}</main>
      <footer className="app-footer">
        {t.footer}
        {" · "}
        <a href={`#${ROUTES.about}`}>{t.aboutLink}</a>
        {route === ROUTES.occupancy && (
          <>
            {" · "}
            <a href={`#${ROUTES.kiosk}`}>{t.kioskLink}</a>
          </>
        )}
      </footer>
      <TabBar route={route} workoutInProgress={active !== null} />
    </>
  );
}
