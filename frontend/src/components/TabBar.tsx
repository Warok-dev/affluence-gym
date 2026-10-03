import { ROUTES } from "../router";
import { useT } from "../i18n";
import { BoardIcon, BookIcon, DumbbellIcon, WrenchIcon } from "./icons";

interface Props {
  route: string;
  workoutInProgress: boolean;
}

/** Bottom tab bar: the two places of the app, always one thumb away. */
export function TabBar({ route, workoutInProgress }: Props) {
  const t = useT();
  const onWorkouts = route.startsWith(ROUTES.workouts);
  const onLibrary = route.startsWith(ROUTES.exercises) || route.startsWith("/programmes");
  const onEquipment = route.startsWith(ROUTES.equipment);
  const tabs = [
    { href: ROUTES.occupancy, label: t.tabOccupancy, icon: <BoardIcon />, current: !onWorkouts && !onLibrary && !onEquipment },
    {
      href: workoutInProgress ? ROUTES.activeWorkout : ROUTES.workouts,
      label: t.tabWorkouts,
      icon: <DumbbellIcon />,
      current: onWorkouts,
      badge: workoutInProgress ? t.inProgress : null,
    },
    { href: ROUTES.exercises, label: t.tabExercises, icon: <BookIcon />, current: onLibrary },
    { href: ROUTES.equipment, label: t.tabEquipment, icon: <WrenchIcon />, current: onEquipment },
  ];
  return (
    <nav className="tabbar" aria-label={t.navLabel}>
      {tabs.map((tab) => (
        <a key={tab.label} href={`#${tab.href}`} className="tabbar-item" aria-current={tab.current ? "page" : undefined}>
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge && <span className="tabbar-badge">{tab.badge}</span>}
        </a>
      ))}
    </nav>
  );
}
